#![cfg(test)]
use super::*;
use soroban_sdk::testutils::Address as _;
use soroban_sdk::token::{Client as TokenClient, StellarAssetClient};
use soroban_sdk::{symbol_short, Env};

fn setup(env: &Env) -> (JournalismPaywallContractClient, Address, Address, Address) {
    let contract_id = env.register(JournalismPaywallContract, ());
    let client = JournalismPaywallContractClient::new(env, &contract_id);

    let admin = Address::generate(env);
    let token = env.register_stellar_asset_contract_v2(admin.clone());
    client.init(&token);

    let user = Address::generate(env);
    let journalist = Address::generate(env);

    (client, token, user, journalist)
}

#[test]
fn pay_unlocks_article_and_transfers_usdc() {
    let env = Env::default();
    env.mock_all_auths();

    let (client, token, user, journalist) = setup(&env);
    let article = symbol_short!("art1");
    let amount = 200_000i128;

    let token_admin = StellarAssetClient::new(&env, &token);
    token_admin.mint(&user, &amount);

    assert!(!client.is_unlocked(&user, &article));
    client.pay_for_article(&user, &article, &journalist, &amount);
    assert!(client.is_unlocked(&user, &article));

    let token_client = TokenClient::new(&env, &token);
    assert_eq!(token_client.balance(&journalist), amount);
}

#[test]
fn second_payment_is_free() {
    let env = Env::default();
    env.mock_all_auths();

    let (client, token, user, journalist) = setup(&env);
    let article = symbol_short!("art2");
    let amount = 200_000i128;

    let token_admin = StellarAssetClient::new(&env, &token);
    token_admin.mint(&user, &(amount * 2));

    client.pay_for_article(&user, &article, &journalist, &amount);
    client.pay_for_article(&user, &article, &journalist, &amount);

    let token_client = TokenClient::new(&env, &token);
    assert_eq!(token_client.balance(&journalist), amount);
}

#[test]
fn is_unlocked_before_payment_is_false() {
    let env = Env::default();
    let (client, _, user, _) = setup(&env);
    let article = symbol_short!("art3");
    assert!(!client.is_unlocked(&user, &article));
}

#[test]
fn double_init_fails() {
    let env = Env::default();
    let contract_id = env.register(JournalismPaywallContract, ());
    let client = JournalismPaywallContractClient::new(&env, &contract_id);
    let token = Address::generate(&env);
    client.init(&token);
    assert_eq!(client.try_init(&token), Err(Ok(Error::AlreadyInitialized)));
}

#[test]
fn pay_before_init_fails() {
    let env = Env::default();
    env.mock_all_auths();
    let contract_id = env.register(JournalismPaywallContract, ());
    let client = JournalismPaywallContractClient::new(&env, &contract_id);
    let user = Address::generate(&env);
    let journalist = Address::generate(&env);
    let article = symbol_short!("art4");
    assert_eq!(
        client.try_pay_for_article(&user, &article, &journalist, &200_000),
        Err(Ok(Error::NotInitialized))
    );
}

#[test]
fn rejects_non_positive_amount() {
    let env = Env::default();
    env.mock_all_auths();
    let (client, _, user, journalist) = setup(&env);
    let article = symbol_short!("art5");
    assert_eq!(
        client.try_pay_for_article(&user, &article, &journalist, &0),
        Err(Ok(Error::InvalidAmount))
    );
}
