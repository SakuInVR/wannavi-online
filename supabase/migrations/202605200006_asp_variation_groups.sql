-- ASP material variation groups: parent_id self-reference.

alter table public.asp_materials
  add column if not exists parent_id uuid references public.asp_materials(id) on delete set null;

create index asp_materials_parent_id_idx on public.asp_materials (parent_id);

-- View: grouped materials with variation count
create or replace view public.asp_material_groups as
select
  p.id as group_id,
  p.name,
  p.asp_name,
  p.description,
  p.price_note,
  p.category_hint,
  p.usage_type,
  p.disclosure_info,
  count(c.id) as variation_count,
  p.created_at
from public.asp_materials p
left join public.asp_materials c on c.parent_id = p.id
where p.parent_id is null and p.status = 'active'
group by p.id;
