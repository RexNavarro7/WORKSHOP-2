#![no_std]
//! Hyper-Local Journalism Paywall — Soroban access registry for pay-per-view articles.
//!
//! Tracks which wallet addresses have paid for which articles on-chain, transfers
//! USDC micro-payments to journalists, and prevents double-charging for unlocked content.

use soroban_sdk::{contract, contracterror, contractimpl, contracttype, token, Address, Env, Symbol};

#[contracttype]
pub enum DataKey {
    Token,
    Unlocked(Address, Symbol),
}

#[contracterror]
#[derive(Copy, Clone, Debug, Eq, PartialEq, PartialOrd, Ord)]
#[repr(u32)]
pub enum Error {
    AlreadyInitialized = 1,
    NotInitialized = 2,
    InvalidAmount = 3,
}

#[contract]
pub struct JournalismPaywallContract;

#[contractimpl]
impl JournalismPaywallContract {
    /// Store the USDC Stellar Asset Contract address. Can only be called once.
    pub fn init(env: Env, token: Address) -> Result<(), Error> {
        if env.storage().instance().has(&DataKey::Token) {
            return Err(Error::AlreadyInitialized);
        }
        env.storage().instance().set(&DataKey::Token, &token);
        env.storage().instance().extend_ttl(1000, 5000);
        Ok(())
    }

    /// Transfer `amount` USDC from `user` to `journalist`, then record unlock access.
    /// If the article is already unlocked for this user, returns Ok without charging again.
    pub fn pay_for_article(
        env: Env,
        user: Address,
        article_id: Symbol,
        journalist: Address,
        amount: i128,
    ) -> Result<(), Error> {
        user.require_auth();

        let key = DataKey::Unlocked(user.clone(), article_id.clone());
        if env.storage().instance().get(&key).unwrap_or(false) {
            return Ok(());
        }

        if amount <= 0 {
            return Err(Error::InvalidAmount);
        }

        let token_addr: Address = env
            .storage()
            .instance()
            .get(&DataKey::Token)
            .ok_or(Error::NotInitialized)?;

        let token_client = token::Client::new(&env, &token_addr);
        token_client.transfer(&user, &journalist, &amount);

        env.storage().instance().set(&key, &true);
        env.storage().instance().extend_ttl(1000, 5000);
        Ok(())
    }

    /// Read-only check: has `user` already unlocked `article_id`?
    pub fn is_unlocked(env: Env, user: Address, article_id: Symbol) -> bool {
        env.storage()
            .instance()
            .get(&DataKey::Unlocked(user, article_id))
            .unwrap_or(false)
    }
}

mod test;
