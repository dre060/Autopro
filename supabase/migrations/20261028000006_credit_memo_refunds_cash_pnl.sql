-- Refunds recorded on a credit memo post as money paid out (Dr AR, Cr cash),
-- and the cash-basis P&L returns account subtypes (repair vs vehicle split).

create or replace function public.post_payment(p_id uuid)
returns void language plpgsql security definer set search_path = '' as $$
declare p public.payments%rowtype; v_cust uuid; v_memo text; s int := 1;
begin
  select * into p from public.payments where id = p_id;
  if not found or p.method = 'credit_memo' then
    perform public.post_entry('payment', p_id, null, null, null);
    perform public.post_entry('payment_void', p_id, null, null, null);
    return;
  end if;
  if p.repair_order_id is not null then
    select customer_id,
           case when doc_type = 'credit_memo' then 'Refund – credit memo #' else 'Payment – ' || case when invoice_number is null then 'RO #' else 'invoice #' end end
             || coalesce(invoice_number, number),
           case when doc_type = 'credit_memo' then -1 else 1 end
    into v_cust, v_memo, s from public.repair_orders where id = p.repair_order_id;
  else
    select customer_id, 'Payment – deal #' || number into v_cust, v_memo from public.vehicle_deals where id = p.deal_id;
  end if;
  perform public.post_entry('payment', p_id, public.local_day(p.received_at), v_memo || ' (' || p.method || ')', jsonb_build_array(
    jsonb_build_object('acct','1050','dr', s * p.amount),
    jsonb_build_object('acct','1100','cr', s * p.amount, 'customer_id', v_cust)));
  if p.voided_at is not null then
    perform public.post_reversal('payment', p_id, 'payment_void', public.local_day(p.voided_at), 'Void ' || v_memo);
  else
    perform public.post_entry('payment_void', p_id, null, null, null);
  end if;
end;
$$;
revoke all on function public.post_payment(uuid) from public, anon, authenticated;

drop function if exists public.pnl_cash(date, date);
create function public.pnl_cash(p_from date, p_to date)
returns table (account_id uuid, code text, name text, type text, subtype text, schedule_c text, amount numeric)
language sql stable security invoker set search_path = '' as $$
  with pay as (
    select p.amount, p.repair_order_id, p.deal_id
    from public.payments p
    where p.voided_at is null and p.method <> 'credit_memo'
      and public.local_day(p.received_at) between p_from and p_to
  ), sales as (
    -- invoice share
    select l.account_id, (l.credit - l.debit) * pay.amount / nullif(ro.total, 0) amt
    from pay join public.repair_orders ro on ro.id = pay.repair_order_id and ro.voided_at is null
    join public.journal_entries e on e.source_type = 'invoice' and e.source_id = ro.id
    join public.journal_lines l on l.entry_id = e.id
    join public.accounts a on a.id = l.account_id and a.type in ('income','cogs')
    union all
    -- deal share
    select l.account_id, (l.credit - l.debit) * pay.amount / nullif(d.total_due, 0)
    from pay join public.vehicle_deals d on d.id = pay.deal_id and d.status = 'final'
    join public.journal_entries e on e.source_type in ('deal','deal_cogs') and e.source_id = d.id
    join public.journal_lines l on l.entry_id = e.id
    join public.accounts a on a.id = l.account_id and a.type in ('income','cogs')
  ), spend as (
    select l.account_id, l.credit - l.debit amt
    from public.journal_entries e join public.journal_lines l on l.entry_id = e.id
    join public.accounts a on a.id = l.account_id and a.type in ('cogs','expense')
    where (e.source_type = 'bill' and exists (select 1 from public.expenses x where x.id = e.source_id and x.status = 'paid'
              and x.voided_at is null and coalesce(x.paid_at, x.expense_date) between p_from and p_to))
       or (e.source_type in ('payroll','manual','estimated_tax') or e.source_type like 'depreciation_%')
          and e.entry_date between p_from and p_to
  )
  select a.id, a.code, a.name, a.type, a.subtype, a.schedule_c, round(coalesce(sum(x.amt), 0), 2)
  from public.accounts a left join (select * from sales union all select * from spend) x on x.account_id = a.id
  where a.type in ('income','cogs','expense')
  group by a.id order by a.code;
$$;
grant execute on function public.pnl_cash(date, date) to authenticated;
