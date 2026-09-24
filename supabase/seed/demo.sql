insert into system_config (key, value, description)
values
  ('low_stock_threshold', '20', 'approximate_stock reminder threshold'),
  ('use_soon_threshold', '40', 'freshness score threshold for priority display')
on conflict (key) do update set value = excluded.value, updated_at = now();

insert into food_knowledge (canonical_name, category, storage_location, typical_storage_min_days, typical_storage_max_days, warning_signs, storage_notes, source_title)
values
  ('spinach', '蔬菜', '冷藏', 2, 5, '叶片发黄、黏滑或异味', '用纸巾吸湿后冷藏', 'Demo curated food knowledge'),
  ('broccoli', '蔬菜', '冷藏', 3, 7, '明显发黏或异味', '冷藏并避免积水', 'Demo curated food knowledge'),
  ('banana', '水果', '常温', 2, 6, '严重渗液或霉变', '成熟度会改变可用窗口', 'Demo curated food knowledge'),
  ('milk', '乳制品', '冷藏', 1, 7, '以包装日期、冷藏状态和气味为准', '开封后参考包装说明', 'Demo curated food knowledge'),
  ('chicken breast', '肉类', '冷冻', 14, 90, '日期或解冻状态不明', '解冻后按储存状态处理', 'Demo curated food knowledge')
on conflict do nothing;
