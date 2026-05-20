-- ASP material variations: usage metadata for smart article insertion.

-- 1. Add usage metadata columns to asp_materials
alter table public.asp_materials
  add column if not exists usage_type text not null default 'recommendation',
  add column if not exists display_style text not null default 'product_card',
  add column if not exists placement_context text,
  add column if not exists variation_label text;

-- usage_type values:
--   'recommendation'  - おすすめ商品として紹介
--   'comparison'      - 比較表の1行として掲載
--   'tool_intro'      - 必要な道具・機材として紹介
--   'budget_option'   - 予算別の選択肢として掲載
--   'step_up'         - 次のステップとして紹介

-- display_style values:
--   'inline_link'     - 文中リンク
--   'product_card'    - 商品カード (画像+説明+リンク)
--   'comparison_row' - 比較表の行
--   'cta_banner'     - CTAバナー

-- 2. Bulk insert helper (accepts JSON array)
create or replace function public.bulk_insert_asp_materials(
  materials jsonb
)
returns setof public.asp_materials
language plpgsql
security definer
as $$
declare
  item jsonb;
  result public.asp_materials;
begin
  for item in select * from jsonb_array_elements(materials)
  loop
    insert into public.asp_materials (
      name, description, asp_name, affiliate_url, image_url,
      price_note, category_hint, usage_type, display_style,
      placement_context, variation_label
    ) values (
      item->>'name',
      item->>'description',
      item->>'asp_name',
      item->>'affiliate_url',
      item->>'image_url',
      item->>'price_note',
      item->>'category_hint',
      coalesce(item->>'usage_type', 'recommendation'),
      coalesce(item->>'display_style', 'product_card'),
      item->>'placement_context',
      item->>'variation_label'
    )
    returning * into result;
    return next result;
  end loop;
  return;
end;
$$;
