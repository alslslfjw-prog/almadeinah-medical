create schema if not exists private;

create or replace function private.get_alqutabi_gateway_config()
returns jsonb
language plpgsql
security definer
set search_path = vault, pg_catalog
as $$
declare
    v_base_url text;
    v_api_key text;
    v_app_key text;
    v_merchant_id text;
begin
    select decrypted_secret
      into v_base_url
      from vault.decrypted_secrets
     where name = 'alqutabi_live_base_url';

    select decrypted_secret
      into v_api_key
      from vault.decrypted_secrets
     where name = 'alqutabi_live_api_key';

    select decrypted_secret
      into v_app_key
      from vault.decrypted_secrets
     where name = 'alqutabi_live_app_key';

    select decrypted_secret
      into v_merchant_id
      from vault.decrypted_secrets
     where name = 'alqutabi_live_merchant_id';

    if v_base_url is null
       or v_api_key is null
       or v_app_key is null
       or v_merchant_id is null
    then
        raise exception 'Alqutabi live gateway configuration is incomplete';
    end if;

    return jsonb_build_object(
        'base_url', v_base_url,
        'api_key', v_api_key,
        'app_key', v_app_key,
        'merchant_id', v_merchant_id,
        'currency_id', 1
    );
end;
$$;

create or replace function public.get_alqutabi_gateway_config()
returns jsonb
language sql
security invoker
set search_path = public, private
as $$
    select private.get_alqutabi_gateway_config();
$$;

revoke all on function private.get_alqutabi_gateway_config() from public, anon, authenticated;
revoke all on function public.get_alqutabi_gateway_config() from public, anon, authenticated;
grant execute on function private.get_alqutabi_gateway_config() to service_role;
grant execute on function public.get_alqutabi_gateway_config() to service_role;

notify pgrst, 'reload schema';
