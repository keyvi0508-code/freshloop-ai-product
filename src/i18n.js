import { EXTRA_EN } from './i18nExtra.js';
import { STORAGE_EN } from './storageEnglish.js';
import { localizeEnglishDates } from './dateInput.js';
import { INGREDIENT_EN } from './data/ingredientLabels.js';

const EN = new Map(Object.entries({
  ...EXTRA_EN,
  ...STORAGE_EN,
  ...INGREDIENT_EN,
  '收藏': 'Save recipe', '取消收藏': 'Unsave recipe',
  '切换界面和菜谱语言；已有菜谱翻译后缓存，自填偏好保留原文。': 'Changes the interface and recipes. Existing recipes are translated and cached; your own preference notes stay unchanged.',
  '必备食材当前无库存': 'Essential ingredient is out of stock',
  '数量未追踪，请确认家中余量': 'Quantity is not tracked; check how much you have',
  '精细库存不足': 'Tracked stock is insufficient',
  '估算库存偏低，请确认是否需要补货': 'Estimated stock is low; check whether to restock',
  '生抽': 'Light soy sauce', '老抽': 'Dark soy sauce', '蒜': 'Garlic', '大蒜': 'Garlic', '淀粉': 'Starch', '米醋': 'Rice vinegar', '鲜辣椒': 'Fresh chilli', '洋葱': 'Onion', '青柠': 'Lime', '盐': 'Salt', '糖': 'Sugar', '葱': 'Scallion', '葱花': 'Chopped scallion', '姜': 'Ginger',
  '瓣': 'clove', '杯': 'cup', '茶匙': 'tsp', '汤匙': 'tbsp',
  '把食材用在刚好的时候': 'Use ingredients at their best',
  '看看今日推荐': "Today's recommendations",
  '食材库': 'Inventory', '食谱': 'Recipes', '采购': 'Shopping', '档案': 'Profile',
  '全部': 'All', '肉蛋奶及蛋白质': 'Protein & dairy', '蔬菜水果': 'Produce', '主食及碳水': 'Staples', '调味品': 'Condiments', '其他食品': 'Other',
  '冷藏': 'Fridge', '冷冻': 'Freezer', '常温': 'Room temp',
  '螃蟹': 'Crab', '肉类与海鲜': 'Meat & seafood', '菜心': 'Choy sum', '通心菜': 'Water spinach', '空心菜': 'Water spinach',
  '录入新食材': 'Add ingredients', '手动添加食材': 'Add manually', '上传小票': 'Upload receipt', '上传合照': 'Upload photo',
  '搜索食材名或储存方式': 'Search ingredient or storage', '管理': 'Manage', '完成': 'Done',
  '今日推荐': "Today's recommendations", '此刻想法': 'Meal request', '收藏夹': 'Favorites', '换一组': 'Refresh', '更新中…': 'Updating…',
  '动态生成': 'Generated live', '今天想做': 'Cook today', '取消今日计划': 'Remove from today', '先收藏': 'Save', '已收藏': 'Saved',
  '偏好与提醒': 'Preferences & reminders', '提醒方式': 'Notifications', '已开启': 'Enabled', '开启通知': 'Enable',
  '界面语言': 'Interface language', '中文（简体）': 'Chinese (Simplified)', '课程展示时可随时切换，菜谱与识图也会沿用该语言。': 'Switch at any time; recipes and recognition will use the same language.',
  '过敏与明确忌口': 'Allergies & exclusions', '不可违反': 'Hard constraint', '口味画像': 'Taste profile', '喜欢的味道': 'Favourite tastes', '地区风味': 'Regional cuisines', '更多偏好': 'More preferences',
  '冰箱温度': 'Appliance temperatures', '冷藏温度': 'Fridge temperature', '冷冻温度': 'Freezer temperature', '必备食材清单': 'Essential ingredients',
  '通知通道': 'Notification channel', '允许短信提醒': 'Allow SMS reminders', '临期食材提醒': 'Expiry reminders', '每日食谱规划': 'Daily recipe planning', '“今天想做”确认': 'Cook-today confirmation', '做完后的消耗记录': 'Post-meal usage review', '规律用餐': 'Meal schedule',
  '仅应用内/电脑': 'App / computer only', '仅短信': 'SMS only', '应用内 + 短信': 'App + SMS',
  '用户须知': 'User notice', '重置演示数据': 'Reset demo data',
  '采购清单': 'Shopping list', '需要购买': 'To buy', '待处理': 'pending', '添加': 'Add', '你的必备食材': 'Your essentials', '去档案调整 →': 'Edit in Profile →',
  '确认识别清单': 'Review recognised items', '食材合照识别': 'Ingredient photo recognition', '购物小票识别': 'Receipt recognition', '预计到期': 'Quality reminder', '请核对包装': 'Check package', '按包装': 'See package', '不可用': 'Unavailable', '全部采用当前参考日期': 'Use the current reference dates',
  '请核对名称、分类、数量、储存方式和日期；包装日期敏感的食材会单独标出。': 'Check the name, category, amount, storage method, and date. Items that depend on package dates are highlighted.', '储存日期会跟随所选方式变化': 'The reminder date changes with the selected storage method',
  '取消': 'Cancel', '保存修改': 'Save changes', '确认并加入食材库': 'Confirm and add to inventory',
  '用手机号开始': 'Start with your phone', '获取短信验证码': 'Send verification code', '直接体验演示': 'Try the demo', '输入短信验证码': 'Enter SMS code', '验证并继续': 'Verify and continue', '换一个手机号': 'Use another number',
  '让推荐真正适合你': 'Make recommendations truly yours', '必须先知道的饮食信息': 'Essential dietary information', '怎么称呼你': 'Your name', '过敏食材': 'Allergens', '明确不喜欢或忌口': 'Dislikes or exclusions', '其他补充': 'Anything else',
  '喜欢的味道（可多选）': 'Favourite tastes (choose any)', '常喜欢的地区风味（可多选）': 'Favourite cuisines (choose any)', '冰箱温度与生活节奏': 'Temperatures & routine', '提醒稍后设置': 'Set reminders later', '保存并进入 FreshLoop': 'Save and enter FreshLoop',
  '菠菜': 'Spinach', '西兰花': 'Broccoli', '鸡蛋': 'Eggs', '鸡胸肉': 'Chicken breast', '番茄': 'Tomato', '牛奶': 'Milk', '香蕉': 'Bananas', '大米': 'Rice', '酱油': 'Soy sauce', '食用油': 'Cooking oil', '酸奶': 'Yogurt', '燕麦棒': 'Granola bars', '豆腐': 'Tofu', '蚝油': 'Oyster sauce', '香菜': 'Coriander', '欧芹': 'Parsley',
  '蔬菜': 'Vegetable', '水果': 'Fruit', '肉类': 'Meat', '蛋类': 'Eggs', '乳制品': 'Dairy', '豆制品': 'Soy product', '主食': 'Staple', '调味料': 'Condiment',
  '个': 'pc', '颗': 'pc', '根': 'stalk', '把': 'bunch', '袋': 'bag', '盒': 'box', '瓶': 'bottle', '包': 'pack', '块': 'piece', '克': 'g', '千克': 'kg', '毫升': 'ml', '升': 'L', '份': 'serving',
  '已开封': 'Opened', '未开封': 'Sealed', '包装状态': 'Package status', '储存方式': 'Storage', '预计品质提醒日': 'Quality reminder date',
  '今日推荐已更新': "Today's recommendations updated",
  '切换界面与新生成内容的语言；已保存的菜谱和自填文字保留原文。': 'Changes the interface and new results. Saved recipes and your own text keep their original language.',
  '返回': 'Back', '返回推荐': 'Back to recommendations', '返回食材库': 'Back to inventory', '修改想法': 'Edit request', '查看通知': 'Notifications', '关闭': 'Close', '编辑': 'Edit', '删除': 'Delete',
  '看清手边的食材，也为下一顿留一点灵感。': 'Know what you have and find inspiration for your next meal.',
  '手动添加一项，或上传小票、食材合照后统一核对。': 'Add an item manually, or upload a receipt or food photo to review.',
  '库存': 'In stock', '临期': 'Due soon', '待补充': 'To restock', '已记录': 'Tracked', '大致库存': 'Estimated stock', '用完即删': 'Remove when used up', '用完即清': 'Remove when used up', '建议补货': 'Restock soon', '待确认': 'To confirm', '今天到期': 'Due today', '明天到期': 'Due tomorrow',
  '3 天内': 'Within 3 days', '4–6 天': '4–6 days', '6 天以上': 'Over 6 days', '已过期': 'Past recorded date',
  '“寒热”等表述仅为传统饮食文化资料，不作健康建议。': 'Traditional “hot/cold” food descriptions are cultural references, not health advice.',
  '从现有库存出发，也允许一点新鲜灵感；过敏与明确忌口始终是硬约束。': 'Start with what you have, with room for new ideas. Allergies and exclusions always come first.',
  '没有用模板冒充 AI 结果': 'No template substituted for an AI result', '重新连接并生成': 'Reconnect and generate',
  '配置服务后点击“重新连接并生成”，才会出现新菜谱。': 'After configuring the service, select Reconnect and generate.',
  '正在检索资料并现场生成': 'Retrieving references and generating recipes', '通常需要 15–40 秒；超过 65 秒会自动停止，不会无限等待。': 'Usually takes 15–40 seconds; the request stops after 65 seconds.', '取消本次生成': 'Cancel generation',
  '尽量用现有库存': 'Use what you have', '少量补齐新食材': 'Add a few ingredients', '只补少量新食材': 'Add a few ingredients', '家中食材已够用': 'Ingredients ready', '家中食材已足够完成这道菜': 'You have enough ingredients for this dish', '现有库存可以完成': 'Use current inventory',
  '照此刻的想法来': 'What are you craving?', '此刻明确说出的味道和菜式优先于库存便利，但绝不会越过过敏与明确忌口。': 'Your current tastes and dish requests come before pantry convenience, but never before allergies or exclusions.',
  '今天想吃什么？': 'What would you like to eat?', '人数': 'Servings', '备餐时间': 'Cooking time', '主食选择': 'Staple choice', '这顿不一定要主食': 'No staple required',
  '你明确写出的味道和菜式会作为硬标准；即使库存没有辣椒，也会照样生成真正有辣椒的菜。': 'Explicit tastes and dishes are requirements. A spicy request includes chilli even if it needs buying.',
  '四个方案怎样分配': 'How the four options work', '2 道尽量使用现有核心食材，2 道允许少量补齐；每道菜最多 3 种核心食材。': 'Two pantry-first options and two with a few additions. At most three core ingredients per dish.',
  '调味料默认从家里选': 'Use your existing seasonings first', '整组最多只有 1 道菜缺 1 种调味料；点名菜式确实需要时才例外。': 'At most one dish needs one extra seasoning, except when essential to a requested dish.',
  '尚未记录调味库存': 'No seasonings recorded', '优先使用': 'Prioritise', '只展示适合入菜的肉蛋、豆制品、蔬菜和水果': 'Cooking ingredients only: meat, eggs, soy products and produce',
  '正在构思 4 道菜': 'Creating four options', '给我 4 个选择': 'Give me four options', '这几道，你更想做哪一道？': 'Which one would you like to cook?',
  '每一道都重新核对了口味、时间、库存和硬约束；选中后，缺的食材才会加入采购。': 'Checked against tastes, time, inventory and exclusions. Missing items enter shopping only after selection.',
  '还想往哪个方向调整？': 'What would you like to change?', '继续调整': 'Refine options', '按库存与想法生成': 'Based on your inventory and request',
  '已加入采购清单': 'Added to shopping list', '选择“今天想做”后加入采购 →': 'Choose Cook today to add missing items →',
  '从多少油、什么火候开始，一步一步做': 'Step by step, from oil quantity to heat level', '需要调整': 'Needs review', '约束已检查': 'Constraints checked',
  '食材与调味': 'Ingredients & seasonings', '需购买': 'To buy', '处理准备': 'Preparation', '烹饪时间线': 'Cooking steps', '不翻车小贴士': 'Helpful tips',
  '喜欢的灵感先留在这里，想做时再把缺少的食材放进采购清单。': 'Save ideas here. Add missing ingredients to shopping when you decide to cook.',
  '还没有收藏。点亮一颗星，它就会留在这里。': 'No favourites yet. Select a star to save a recipe.',
  '已确认做过 · 等待核对实际用量，库存尚未扣减': 'Cooked · awaiting actual usage review; stock has not been deducted',
  '你的口味、冰箱实际温度和提醒节奏都会参与推荐；这里的设置之后随时能改。': 'Your tastes, appliance temperatures and reminder schedule shape recommendations. Update them here at any time.',
  '过敏与忌口是不可违反的硬约束': 'Allergies and exclusions are hard constraints', '手机号未同步': 'Phone not synced', '过敏': 'Allergy', '不喜欢': 'Dislike', '还没有形成口味画像': 'No taste profile yet',
  '酸香': 'Tangy', '甜口': 'Sweet', '微苦回甘': 'Gently bitter', '辣': 'Spicy', '鲜香': 'Savoury', '清淡': 'Light', '浓郁': 'Rich',
  '中式家常': 'Chinese home-style', '川湘': 'Sichuan / Hunan', '粤式': 'Cantonese', '江浙': 'Jiangsu / Zhejiang', '新加坡/南洋': 'Singapore / Nanyang', '日式': 'Japanese', '韩式': 'Korean', '西式': 'Western', '地中海': 'Mediterranean',
  '请以冰箱显示或温度计实测为准；生成储存建议时会带上这两个条件。': 'Use appliance or thermometer readings. Both temperatures inform storage guidance.',
  '常用参考 ≤4°C': 'Reference: ≤4°C', '常用参考 ≤−18°C': 'Reference: ≤−18°C',
  '每种食材单独设置低于多少库存时提醒采购。': 'Set a separate low-stock reminder threshold for each item.', '低于': 'Below',
  '可随时关闭，不用于营销': 'Turn off any time; not used for marketing', '到期前几天开始提醒': 'How many days before the recorded date', '天前': 'days before',
  '开启并选择每天查看推荐的时间': 'Enable and choose your daily recommendation time', '到点后询问这道菜实际做了没有': 'Ask whether you actually cooked at the selected time',
  '只有确认做了才会进入用量核对': 'Review usage only after confirming you cooked', '确认做了后立即核对': 'Review immediately after confirmation', '每天固定时间集中核对': 'Review at a fixed daily time', '不记录用量，用完手动删除': 'Do not log usage; remove manually when used up',
  '集中核对时间': 'Daily review time', '处理当天等待确认的用量': 'Review pending usage for the day', '每天': 'Daily', '顿': 'meals', '现在确认': 'Review now',
  '把食材用在': 'Use ingredients', '刚好的时候': 'at their best', '手机号': 'Phone number', '6 位验证码': '6-digit code', '或': 'or', '本地演示模式：验证码': 'Local demo code:',
  '记住你的库存、口味和生活节奏，把每一次推荐变成真正适合你的那一餐。': 'Keep track of ingredients, tastes and routines for meals that suit you.',
  '按食材与温度检索储存建议': 'Storage references by ingredient and temperature', '菜谱会避开过敏与明确忌口': 'Recipes account for allergies and exclusions', '采购、提醒与餐后记录连在一起': 'Shopping, reminders and usage review in one place',
  '注册与登录使用同一入口。手机号验证后，你的档案可以安全同步到后端。': 'One entry for sign-up and sign-in. Cloud sync requires a configured authentication service.',
  '请包含国家/地区代码；验证短信可能产生运营商费用。': 'Include the country code. Verification messages may incur carrier charges.',
  '先认识你的餐桌': 'Tell us about your table', '约 2 分钟 · 之后都能在档案修改': 'About 2 minutes · editable in Profile later',
  '过敏与明确忌口是硬约束；口味偏好会影响调料种类、用量和地区做法。': 'Allergies and exclusions are constraints. Tastes influence seasonings, quantities and cooking styles.',
  '可以直接采用默认值；提醒也可以稍后再填。': 'Use defaults, or set reminders later.', '常用参考：4°C 或以下': 'Reference: 4°C or below', '常用参考：−18°C 或以下': 'Reference: −18°C or below',
  '请填写冰箱显示或温度计读数。设定值不等于实际温度；储存建议会将这里的温度作为检索条件。': 'Enter appliance or thermometer readings. Set points may differ from actual temperatures; these values inform storage references.',
  '每天几顿': 'Meals per day', '第一顿': 'Meal 1', '第二顿': 'Meal 2', '第三顿': 'Meal 3', '每日食谱提醒': 'Daily recipe reminder',
  '开启应用内/电脑提醒': 'Enable app / computer reminders', '同意将提醒同时发送到已验证手机号': 'Also send reminders to my verified phone',
  '食材名称': 'Ingredient name', '生成储存建议': 'Get storage guidance', '数量': 'Amount', '单位': 'Unit', '可以怎样储存？': 'Storage options',
  '预计最佳品质提醒日': 'Quality reminder date', '先看适用条件，再按你的使用打算选择。日期是最佳品质提醒，不是安全保证。': 'Check conditions before choosing. Dates are quality reminders, not safety guarantees.',
  '包装标注到期日（推荐）': 'Package expiry date (recommended)', '暂按参考日期': 'Use reference date for now', '修改': 'Edit', '请先生成建议': 'Get guidance first', '重新生成': 'Generate again',
  '库存中没有该食材': 'Not in inventory', '手动添加': 'Added manually', '清单已清空': 'List is empty', '已购买': 'Purchased', '确认购买': 'Confirm purchase',
  '花生': 'Peanuts', '面条': 'Noodles', '牛肉': 'Beef', '猪肉': 'Pork', '鸡肉': 'Chicken', '鸡翅': 'Chicken wings', '虾': 'Shrimp', '小米辣': "Bird's eye chilli", '干辣椒': 'Dried chilli', '辣椒': 'Chilli', '米粉': 'Rice noodles', '鱼露': 'Fish sauce', '豆浆': 'Soy milk',
  '三天内': 'Within 3 days', '待补货': 'To restock', '0–3 天': '0–3 days', '管理食材': 'Manage ingredients', '添加食材': 'Add ingredients', '主导航': 'Main navigation', '提醒百分比': 'Reminder threshold (%)',
  '“寒、热、凉、温”等表述仅作为传统饮食文化资料，不构成健康或医疗建议。': 'Traditional food-temperature descriptions are cultural references, not medical or health advice.',
  '日期来自包装信息或资料检索，只是最佳品质提醒，不等同于食品安全判定；包装说明、实际温度和食材状态始终优先。': 'Dates come from packaging or references. They are quality reminders, not safety assessments. Package instructions, actual temperatures and food condition take priority.',
  '上传购物小票': 'Upload receipt', '上传食材合照': 'Upload food photo', '选择购物小票图片': 'Choose receipt image', '选择食材合照图片': 'Choose food photo',
  '网页版从电脑或手机相册选择图片。图片会交给视觉模型识别；任何结果都要在下一步确认后才入库。': 'Choose a photo from your device. It is sent to the vision model; results enter inventory only after you review and confirm.',
  '支持 JPG、PNG、WEBP，单张不超过 3MB': 'JPG, PNG or WEBP; up to 3 MB per image', '开始识别并生成清单': 'Recognise and create review list', '所选图片预览': 'Selected image preview',
  '正在识别图片并整理清单': 'Recognising the image and preparing your list', '图片超过 3MB，请压缩后再上传': 'Image exceeds 3 MB. Please compress it and try again.', '包装日期需确认': 'Confirm package date', '手动确认': 'Confirm manually'
}));

const PLACEHOLDERS = new Map(Object.entries({
  '搜索食材名或储存方式': 'Search ingredient or storage', '输入食材': 'Enter ingredient', '请输入食材名称': 'Enter ingredient name', '添加其他要买的食材': 'Add another item',
  '例如：小瑜、Alex': 'e.g. Alex', '例如：花生、虾；没有请填“无”': 'e.g. peanuts, shrimp; enter “none” if not applicable', '例如：香菜、葱；没有请填“无”': 'e.g. coriander, scallion; enter “none” if not applicable', '例如：喜欢微辣、少油、偏爱有汤汁': 'e.g. mildly spicy, less oil, saucy dishes',
  '例如：盐、面条': 'e.g. salt, noodles', '例如 +65 8123 4567': 'e.g. +65 8123 4567', '例如：喜欢微辣、有锅气、不要太油': 'e.g. mild heat, wok flavour, less oil',
  '例如：要真正有辣椒的香辣口味、想吃云南风味、想慢炖牛肉……': 'e.g. spicy with chilli, Yunnan-style dishes, or slow-cooked beef…',
  '例如：再辣一点、不要汤、把鸡肉换成豆腐……': 'e.g. spicier, no soup, or replace chicken with tofu…'
}));

function dynamicEnglish(text) {
  const rules = [
    [/^删除「(.+)」后，它会从食材库中移除。$/, (m) => `${translateLabel(m[1])} will be removed from inventory.`],
    [/^库存按“(.+)”记录，请确认是否足够$/, (m) => `Stock is recorded in ${translateLabel(m[1])}; check whether it is enough`],
    [/^必备食材仅剩约 ([\d.]+)%（阈值 ([\d.]+)%）$/, (m) => `Essential stock is about ${m[1]}% (restock threshold: ${m[2]}%)`],
    [/^自动归入「(.+)」；加入列表时才匹配食材图标。$/, (m) => `Category: ${translateLabel(m[1])}. The icon appears after adding to inventory.`],
    [/^建议 (\d+) 天内 · 至 (.+)$/, (m) => `Suggested within ${m[1]} days · until ${m[2]}`],
    [/^还有 (\d+) 天$/, (m) => `${m[1]} days remaining`],
    [/^前提：(.+)$/, (m) => `Conditions: ${translateLabel(m[1])}`],
    [/^(.+)°C（资料基线 ≤(.+)°C）$/, (m) => `${m[1]}°C (reference ≤${m[2]}°C)`],
    [/^新加坡室温环境$/, () => 'Room-temperature conditions in Singapore'],
    [/^编辑(.+)$/, (m) => `Edit ${translateLabel(m[1])}`],
    [/^删除(.+)$/, (m) => `Remove ${translateLabel(m[1])}`],
    [/^查看或编辑(.+)$/, (m) => `View or edit ${translateLabel(m[1])}`],
    [/^打开(.+)完整做法$/, (m) => `Open full recipe: ${m[1]}`],
    [/^(.+)成品参考图$/, (m) => `Reference image: ${m[1]}`],
    [/^「(.+)」已经到期了$/, (m) => `${translateLabel(m[1])} is past its recorded date`],
    [/^删除「(.+)」后，它会从食材库中移除。$/, (m) => `${translateLabel(m[1])} will be removed from inventory.`],
    [/^(\d+) 项食材需要留意日期$/, (m) => `${m[1]} ingredients need a date check`],
    [/^(\d+) 项采购提醒$/, (m) => `${m[1]} shopping reminders`],
    [/^(.+) 看看今日推荐$/, (m) => `${m[1]} · Today's recommendations`],
    [/^今天(?:的|计划的)「(.+)」做了吗？$/, (m) => `Did you cook “${m[1]}” today?`],
    [/^「(.+)」还在等待核对实际用量$/, (m) => `“${m[1]}” is awaiting usage review`],
    [/^有 (\d+) 顿饭等待确认食材消耗$/, (m) => `${m[1]} meals awaiting usage review`],
    [/^菜谱建议 (.+)$/, (m) => `Recipe suggests ${translateLabel(m[1])}`],
    [/^菜谱按 (.+)、库存按 (.+)记录，请填写实际库存单位$/, (m) => `Recipe uses ${translateLabel(m[1])}; inventory uses ${translateLabel(m[2])}. Enter usage in inventory units.`],
    [/^使用前约 (.+)%；请填写用后剩余$/, (m) => `About ${m[1]}% before cooking; enter the percentage remaining`],
    [/^已生成 (\d+) 道可选菜谱$/, (m) => `Generated ${m[1]} recipe options`],
    [/^已加入今日计划；(\d+) 项缺口进入采购，库存暂不扣减$/, (m) => `Planned: ${m[1]} missing items added to shopping. Stock is unchanged.`],
    [/^(.+) 已加入采购清单$/, (m) => `${translateLabel(m[1])} added to shopping`],
    [/^(.+) 已按独立储存建议加入库存$/, (m) => `${translateLabel(m[1])} added with ingredient-specific storage guidance`],
    [/^(\d+) 项食材已加入库存$/, (m) => `${m[1]} ingredients added to inventory`],
    [/^(.+) 已从食材库删除$/, (m) => `${translateLabel(m[1])} removed from inventory`],
    [/^(.+)的剩余信息已更新$/, (m) => `Remaining amount updated: ${translateLabel(m[1])}`],
    [/^(.+) 已保留，并用紫色标记$/, (m) => `${translateLabel(m[1])} kept and marked in purple`],
    [/^(.+) 已删除，记得检查并妥善处理实物$/, (m) => `${translateLabel(m[1])} removed. Check and handle the actual food appropriately.`],
    [/^(.+)：等待超过 (\d+) 秒，已停止本次请求，请重试$/, (m) => `${translateLabel(m[1])}: request stopped after ${m[2]} seconds. Please retry.`],
    [/^(.+)：无法连接本地 AI 接口$/, (m) => `${translateLabel(m[1])}: unable to connect to the AI service`],
    [/^已保存在本机；云端同步待重试：(.+)$/, (m) => `Saved locally; cloud sync needs retrying: ${translateLabel(m[1])}`],
    [/^DeepSeek 请求失败（(.+)）$/, (m) => `AI request failed (${m[1]})`],
    [/^违反过敏硬约束：(.+)$/, (m) => `Allergy conflict: ${translateLabel(m[1])}`],
    [/^包含用户明确不喜欢的食材：(.+)$/, (m) => `Excluded ingredient: ${translateLabel(m[1])}`],
    [/^(.+)库存不足$/, (m) => `Insufficient stock: ${translateLabel(m[1])}`],
    [/^验证码已发送至 (.+)。首次登录后会用两分钟建立饮食画像。$/, (m) => `Code sent to ${m[1]}. First-time users will set up a dietary profile.`],
    [/^你的冷藏设置为 (.+)°C，高于资料基线 4°C；已保守缩短提醒期。(.*)$/, (m) => `Fridge set to ${m[1]}°C, above the 4°C reference; reminder period shortened. ${translateLabel(m[2])}`],
    [/^你的冷冻设置为 (.+)°C，高于长期冷冻资料基线 −18°C；不自动套用该期限，请调整温度或按包装说明。$/, (m) => `Freezer set to ${m[1]}°C, above the −18°C reference. This period is not applied; adjust temperature or follow the label.`]
  ];
  for (const [pattern, replace] of rules) { const match = text.match(pattern); if (match) return replace(match); }
  const pastItems = text.match(/^(\d+) 项已过期并保留在列表中，以紫色标记。你可以在管理模式中删除。$/);
  if (pastItems) return `${pastItems[1]} items are past their recorded dates, shown in purple. Remove them in Manage mode.`;
  const qualityDate = text.match(/^品质提醒 (.+)$/); if (qualityDate) return `Quality reminder ${qualityDate[1]}`;
  let match = text.match(/^(\d+) 天后到期$/); if (match) return `Due in ${match[1]} days`;
  match = text.match(/^已过期 (\d+) 天$/); if (match) return `${match[1]} days past recorded date`;
  match = text.match(/^第 (\d+) 顿$/); if (match) return `Meal ${match[1]}`;
  match = text.match(/^短信只发到已验证手机号 (.*)$/); if (match) return `SMS goes only to your verified phone ${match[1]}`;
  match = text.match(/^(.+)过敏$/); if (match) return `${translateLabel(match[1])} allergy`;
  match = text.match(/^(.+)（不喜欢）$/); if (match) return `${translateLabel(match[1])} (dislike)`;
  match = text.match(/^已加入今日计划 · (.+) 后确认，当前只影响采购清单$/); if (match) return `Planned · review after ${match[1]}; only shopping changes now`;
  match = text.match(/^动态生成 · 结合本次库存抽样、口味画像与 (\d+) 条烹饪知识卡$/); if (match) return `Generated live · pantry selection, taste profile and ${match[1]} cooking references`;
  match = text.match(/^展开其他可入菜库存（(\d+) 项）$/); if (match) return `More cooking ingredients (${match[1]})`;
  match = text.match(/^(.+) · 核心食材 (.+) 种$/); if (match) return `${translateLabel(match[1])} · ${match[2]} core ingredients`;
  match = text.match(/^(\d+) 项需要(?:采购|购买)或确认$/); if (match) return `${match[1]} items to buy or confirm`;
  match = text.match(/^需要补充或确认 (\d+) 项$/); if (match) return `${match[1]} items to add or confirm`;
  match = text.match(/^(\d+) 道“今天想做”等待晚间确认$/); if (match) return `${match[1]} planned dishes awaiting review`;
  match = text.match(/^为 (.+) 生成 · (.+)$/); if (match) return `For ${match[1]} · ${match[2]}`;
  match = text.match(/^(\d+) 人$/); if (match) return `${match[1]} people`;
  match = text.match(/^(\d+) 顿$/); if (match) return `${match[1]} meals`;
  match = text.match(/^([≤\d– .]+) 分钟$/); if (match) return `${match[1]} min`;
  match = text.match(/^([约\d– .]+) 小时(.*)$/); if (match) return `${match[1].replace('约', 'About')} hr${match[2].replace('以上（炖煮）', '+ (slow cooking)').replace('以上', '+').replace('分钟', 'min')}`;
  match = text.match(/^(\d+) 项$/); if (match) return `${match[1]} items`;
  match = text.match(/^(\d+) 天$/); if (match) return `${match[1]} days`;
  match = text.match(/^剩余约 (.+)$/); if (match) return `About ${translateLabel(match[1])} left`;
  match = text.match(/^约 (\d+)%([\s\S]*)$/); if (match) return `About ${match[1]}%${match[2].replace('快用完', 'low').replace('偏少', 'running low').replace('充足', 'plenty')}`;
  match = text.match(/^([\d.]+) (个|颗|根|把|袋|盒|瓶|包|块|克|千克|毫升|升|份|瓣|杯|茶匙|汤匙)$/); if (match) return `${match[1]} ${EN.get(match[2])}`;
  match = text.match(/^(\d+) 人份$/); if (match) return `${match[1]} serving${match[1] === '1' ? '' : 's'}`;
  match = text.match(/^确认 (\d+) 项并加入库存$/); if (match) return `Confirm and add ${match[1]} items`;
  return null;
}

export function translateLabel(text, language = 'en') {
  if (language !== 'en') return text;
  const direct = EN.get(text) || dynamicEnglish(text);
  if (direct) return direct;
  // Separators belong to the interface; translate each label, not arbitrary prose.
  if (text.includes(' · ')) return text.split(' · ').map((part) => translateLabel(part)).join(' · ');
  const emoji = text.match(/^(\p{Extended_Pictographic}[\uFE0F\u200D\p{Extended_Pictographic}]*\s+)(.+)$/u);
  if (emoji) return emoji[1] + (EN.get(emoji[2]) || emoji[2]);
  return text;
}

function translateTextNode(node) {
  const raw = node.nodeValue || '';
  const trimmed = raw.trim();
  if (!trimmed) return;
  const translated = translateLabel(trimmed);
  if (!translated || translated === trimmed) return;
  node.nodeValue = raw.replace(trimmed, translated);
}

export function applyInterfaceLanguage(root, language = 'zh-CN') {
  const english = language === 'en';
  document.documentElement.lang = english ? 'en' : 'zh-CN';
  if (!english || !root) return;
  localizeEnglishDates(root);
  // Display translation must never change a submitted unit/category value.
  root.querySelectorAll?.('option:not([value])').forEach((option) => { option.value = option.textContent; });
  const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
  const nodes = [];
  while (walker.nextNode()) nodes.push(walker.currentNode);
  nodes.filter((node) => !node.parentElement?.closest('textarea, script, style, [data-no-translate]')).forEach(translateTextNode);
  const matching = (selector) => [...(root.matches?.(selector) ? [root] : []), ...root.querySelectorAll(selector)];
  matching('[placeholder]').forEach((element) => { const translated = PLACEHOLDERS.get(element.placeholder) || translateLabel(element.placeholder); if (translated !== element.placeholder) element.placeholder = translated; });
  matching('[aria-label], [title], [alt]').forEach((element) => {
    for (const attr of ['aria-label', 'title', 'alt']) {
      const original = element.getAttribute(attr);
      if (original) { const translated = translateLabel(original); if (translated !== original) element.setAttribute(attr, translated); }
    }
  });
}

// Catch copy inserted after render (loading, errors, date changes and upload reviews).
export function observeInterfaceLanguage(root) {
  const observer = new MutationObserver((records) => {
    if (document.documentElement.lang !== 'en') return;
    const targets = new Set(records.map((record) => record.target.nodeType === 3 ? record.target.parentElement : record.target));
    targets.forEach((target) => { if (target?.isConnected) applyInterfaceLanguage(target, 'en'); });
  });
  observer.observe(root, { childList: true, subtree: true, characterData: true, attributes: true, attributeFilter: ['placeholder', 'aria-label', 'title', 'alt'] });
  return observer;
}
