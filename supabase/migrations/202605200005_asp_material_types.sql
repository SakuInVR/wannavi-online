-- ASP material type system: banner/text ads with multiple link variants.

alter table public.asp_materials
  add column if not exists material_type text not null default 'banner',
  add column if not exists banner_width integer,
  add column if not exists banner_height integer,
  add column if not exists text_content text,
  add column if not exists link_normal text,
  add column if not exists link_amp text,
  add column if not exists link_nojs text,
  add column if not exists disclosure_info text;

-- Migrate existing affiliate_url to link_normal
update public.asp_materials
set link_normal = affiliate_url
where link_normal is null and affiliate_url is not null;
