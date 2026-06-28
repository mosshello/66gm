/**
 * 66GM 游戏数据抓取脚本
 * 
 * 使用方法：
 * 1. 打开浏览器，访问 https://pay.ldxp.cn/shop/HIHBD2RA
 * 2. 按 F12 打开开发者工具，切换到 Console 控制台
 * 3. 复制本文件全部内容，粘贴到控制台，按回车执行
 * 4. 脚本会自动抓取页面上的游戏数据并输出 JSON
 * 5. 将输出的 JSON 保存为 data/games.json
 * 
 * 注意：
 * - 需要逐个点击分类标签来获取不同分类的游戏
 * - 抓取前确保页面已完全加载
 * - 建议抓取完成后手动核对数据
 */

(function() {
  'use strict';
  
  console.log('🎮 66GM 游戏数据抓取工具');
  console.log('========================');
  
  const scraper = {
    games: [],
    categories: [],
    currentCategory: '数字卡密',
    
    // 初始化分类映射
    categoryMap: {
      '数字卡密': 'vip',
      '抖音爆火游戏': 'douyin',
      'APP店长精选': 'app',
      '免费解压小游戏': 'free',
      '异环助手': 'app',
      'Gemini': 'app',
      'Chatgpt官方直充': 'app',
      'TG/电报/飞机/gram 账号': 'app'
    },
    
    // 标签映射
    tagMap: {
      '免广告': 'no-ad',
      '免广告GM': 'no-ad',
      'GM': 'gm',
      '抖音': 'hot',
      '抖音1st': 'hot',
      '抖音爆款': 'hot',
      '爆率': 'hot',
      '解压': 'relax',
      '恐怖': 'horror',
      '模拟': 'sim',
      '益智': 'puzzle',
      '动作': 'action',
      '休闲': 'casual',
      '塔防': 'tower',
      '防守': 'tower',
      '美食': 'food',
      '消除': 'puzzle',
      '消除': 'puzzle',
      '找茬': 'puzzle',
      '射击': 'action',
      '剧情': 'puzzle',
      '弹射': 'action',
      '弹球': 'action',
      '刮刮乐': 'casual',
      ' steam': 'hot',
      '收藏': 'casual',
      '持续更新': 'hot',
    },
    
    /**
     * 从游戏名称解析标签
     */
    parseTags(name) {
      const tags = [];
      
      // 根据关键词匹配标签
      if (name.includes('免广告') || name.includes('去广告')) tags.push('no-ad');
      if (name.includes('GM')) tags.push('gm');
      if (name.includes('抖音') || name.includes('1st')) tags.push('hot');
      if (name.includes('解压') || name.includes('放松')) tags.push('relax');
      if (name.includes('恐怖') || name.includes('猛鬼') || name.includes('怨') || name.includes('诡异') || name.includes('阴间')) tags.push('horror');
      if (name.includes('模拟') || name.includes('经营') || name.includes('咖啡厅') || name.includes('酸奶') || name.includes('外卖') || name.includes('密室')) tags.push('sim');
      if (name.includes('益智') || name.includes('脑洞') || name.includes('法则') || name.includes('逃离') || name.includes('眼神') || name.includes('侦探') || name.includes('刮刮乐')) tags.push('puzzle');
      if (name.includes('动作') || name.includes('闯关') || name.includes('打') || name.includes('箭头') || name.includes('赵云') || name.includes('作战') || name.includes('弹球')) tags.push('action');
      if (name.includes('休闲') || name.includes('躺') || name.includes('合成') || name.includes('消除')) tags.push('casual');
      if (name.includes('塔防') || name.includes('防守')) tags.push('tower');
      if (name.includes('美食') || name.includes('吃') || name.includes('烧烤')) tags.push('food');
      if (name.includes('爆率') || name.includes('超爽')) tags.push('hot');
      if (name.includes(' Steam') || name.includes('steam')) tags.push('hot');
      
      return [...new Set(tags)]; // 去重
    },
    
    /**
     * 生成唯一ID
     */
    generateId(name, category, index) {
      const prefix = category === 'vip' ? 'vip' :
                     category === 'douyin' ? 'dy' :
                     category === 'free' ? 'free' :
                     category === 'app' ? 'app' :
                     category === 'gm' ? 'gm' : 'game';
      return `${prefix}-${String(index + 1).padStart(3, '0')}`;
    },
    
    /**
     * 解析价格
     */
    parsePrice(priceText) {
      if (!priceText || priceText.includes('免费')) return '免费';
      const match = priceText.match(/[\d.]+/);
      return match ? match[0] : '0';
    },
    
    /**
     * 解析库存状态
     */
    parseStock(stockText) {
      if (!stockText) return '一般';
      if (stockText.includes('充足')) return '充足';
      if (stockText.includes('缺货') || stockText.includes('0')) return '缺货';
      return '一般';
    },
    
    /**
     * 获取当前激活的分类名称
     */
    getActiveCategory() {
      // 尝试从页面获取当前选中的分类
      const activeCategoryEl = document.querySelector('.category-item.active, [class*="category"][class*="active"], .selected-category');
      if (activeCategoryEl) {
        const text = activeCategoryEl.textContent.trim();
        // 提取分类名（去掉数量）
        const categoryName = text.replace(/共\d+种商品/, '').replace(/包含\d+件商品/, '').trim();
        if (categoryName) {
          this.currentCategory = categoryName;
          return categoryName;
        }
      }
      return this.currentCategory;
    },
    
    /**
     * 抓取当前页面的游戏列表
     */
    scrapeGames() {
      console.log(`🔍 正在抓取分类: ${this.currentCategory}...`);
      
      const games = [];
      const categoryName = this.getActiveCategory();
      const categoryId = this.categoryMap[categoryName] || 'game';
      
      // 尝试多种选择器来定位游戏卡片
      const selectors = [
        '.goods-item',
        '.product-item', 
        '.game-item',
        '[class*="goods"]',
        '[class*="product"]',
        '.item',
        '.card',
        // 链动小铺特定选择器
        '.shop-goods-item',
        '.goods-card',
        '.commodity-item',
        // 更通用的选择器
        'div[class*="item"]',
        'div[class*="card"]',
      ];
      
      let gameElements = [];
      
      for (const selector of selectors) {
        try {
          const elements = document.querySelectorAll(selector);
          if (elements.length > 0) {
            console.log(`  ✓ 找到 ${elements.length} 个元素 (选择器: ${selector})`);
            gameElements = elements;
            break;
          }
        } catch (e) {
          // 忽略无效选择器
        }
      }
      
      if (gameElements.length === 0) {
        console.log('  ⚠ 未找到游戏元素，尝试备用方法...');
        // 备用：尝试从文本中提取
        return this.scrapeFromText();
      }
      
      gameElements.forEach((el, index) => {
        try {
          // 尝试提取游戏名称
          const nameSelectors = [
            '.goods-name', '.product-name', '.game-name', '.name', '.title',
            '[class*="name"]', '[class*="title"]',
            'h3', 'h4', '.item-name', '.commodity-name'
          ];
          
          let name = '';
          for (const sel of nameSelectors) {
            const nameEl = el.querySelector(sel);
            if (nameEl && nameEl.textContent.trim()) {
              name = nameEl.textContent.trim();
              break;
            }
          }
          
          // 如果没找到，尝试直接获取元素的文本
          if (!name) {
            name = el.textContent.substring(0, 50).trim();
          }
          
          // 跳过无效条目
          if (!name || name.length < 2) return;
          if (name.includes('选择商品') || name.includes('到底了')) return;
          
          // 提取价格
          const priceSelectors = [
            '.price', '.goods-price', '.product-price', '[class*="price"]',
            '.amount', '.cost'
          ];
          let price = '';
          for (const sel of priceSelectors) {
            const priceEl = el.querySelector(sel);
            if (priceEl && priceEl.textContent.trim()) {
              price = this.parsePrice(priceEl.textContent);
              break;
            }
          }
          
          // 从文本中提取价格（备用）
          if (!price) {
            const priceMatch = el.textContent.match(/[￥¥]\s*([\d.]+)/);
            if (priceMatch) price = priceMatch[1];
          }
          
          // 提取库存
          const stockSelectors = [
            '.stock', '.inventory', '[class*="stock"]', '[class*="inventory"]'
          ];
          let stock = '一般';
          for (const sel of stockSelectors) {
            const stockEl = el.querySelector(sel);
            if (stockEl && stockEl.textContent.trim()) {
              stock = this.parseStock(stockEl.textContent);
              break;
            }
          }
          
          // 从文本中提取库存（备用）
          if (stock === '一般') {
            const stockText = el.textContent;
            if (stockText.includes('库存充足')) stock = '充足';
            else if (stockText.includes('库存一般')) stock = '一般';
            else if (stockText.includes('缺货') || stockText.includes('库存0')) stock = '缺货';
          }
          
          // 解析标签
          const tags = this.parseTags(name);
          
          // 判断是否为热门
          const isHot = name.includes('抖音') || name.includes('爆') || name.includes('1st') || 
                        categoryName === '抖音爆火游戏' || tags.includes('hot');
          
          // 生成badge
          let badge = '';
          if (categoryId === 'vip') badge = '推荐';
          else if (price === '免费') badge = '免费';
          else if (tags.includes('gm')) badge = 'GM';
          else if (categoryId === 'app') badge = 'APP';
          else if (isHot) badge = '抖音爆款';
          
          const game = {
            id: this.generateId(name, categoryId, this.games.length + index),
            name: name,
            price: price || '0',
            category: categoryId,
            tags: tags,
            stock: stock,
            description: `${name}，${tags.map(t => {
              const names = { 'no-ad': '免广告', 'gm': 'GM特权', 'hot': '抖音爆款', 'relax': '解压', 'horror': '恐怖', 'sim': '模拟', 'puzzle': '益智', 'action': '动作', 'casual': '休闲', 'tower': '塔防', 'food': '美食' };
              return names[t] || t;
            }).join('、')}`,
            image: '',
            link: `https://pay.ldxp.cn/shop/HIHBD2RA`,
            hot: isHot,
            badge: badge
          };
          
          games.push(game);
        } catch (e) {
          console.log(`  ⚠ 解析第 ${index + 1} 个元素时出错:`, e);
        }
      });
      
      console.log(`  ✅ 成功抓取 ${games.length} 个游戏`);
      return games;
    },
    
    /**
     * 从页面文本中抓取（备用方法）
     */
    scrapeFromText() {
      console.log('  📄 使用文本解析模式...');
      const games = [];
      const bodyText = document.body.innerText;
      
      // 匹配游戏名称和价格模式
      const lines = bodyText.split('\n').map(l => l.trim()).filter(l => l.length > 0);
      
      for (let i = 0; i < lines.length; i++) {
        const line = lines[i];
        
        // 跳过非游戏行
        if (line.includes('选择商品') || line.includes('到底了') || 
            line.includes('库存') || line.includes('￥') && line.length < 5 ||
            line.includes('Powered by') || line.includes('ICP')) {
          continue;
        }
        
        // 寻找包含【】的游戏名称
        if (line.includes('【') && line.length > 5 && line.length < 100) {
          const nextLine = lines[i + 1] || '';
          const priceMatch = nextLine.match(/[￥¥]\s*([\d.]+)/) || line.match(/[￥¥]\s*([\d.]+)/);
          
          if (priceMatch || line.includes('免费')) {
            const name = line;
            const price = priceMatch ? priceMatch[1] : (line.includes('免费') ? '免费' : '0');
            const tags = this.parseTags(name);
            const categoryName = this.getActiveCategory();
            const categoryId = this.categoryMap[categoryName] || 'game';
            
            // 检查库存
            let stock = '一般';
            if (lines[i + 2] && lines[i + 2].includes('库存充足')) stock = '充足';
            else if (lines[i + 2] && lines[i + 2].includes('缺货')) stock = '缺货';
            
            const isHot = name.includes('抖音') || name.includes('爆') || categoryName === '抖音爆火游戏';
            
            let badge = '';
            if (categoryId === 'vip') badge = '推荐';
            else if (price === '免费') badge = '免费';
            else if (tags.includes('gm')) badge = 'GM';
            else if (isHot) badge = '抖音爆款';
            
            games.push({
              id: this.generateId(name, categoryId, this.games.length + games.length),
              name: name,
              price: price,
              category: categoryId,
              tags: tags,
              stock: stock,
              description: name,
              image: '',
              link: 'https://pay.ldxp.cn/shop/HIHBD2RA',
              hot: isHot,
              badge: badge
            });
          }
        }
      }
      
      console.log(`  ✅ 文本模式抓取 ${games.length} 个游戏`);
      return games;
    },
    
    /**
     * 抓取所有分类的游戏
     */
    async scrapeAllCategories() {
      console.log('🚀 开始抓取所有分类...');
      console.log('');
      
      // 获取所有分类标签
      const categorySelectors = [
        '.category-item',
        '.category-tab',
        '[class*="category"]',
        '.tab-item',
        '.filter-item'
      ];
      
      let categoryTabs = [];
      for (const sel of categorySelectors) {
        const tabs = document.querySelectorAll(sel);
        if (tabs.length > 0) {
          categoryTabs = Array.from(tabs);
          break;
        }
      }
      
      if (categoryTabs.length === 0) {
        console.log('⚠ 未找到分类标签，将抓取当前页面...');
        const games = this.scrapeGames();
        this.games = this.games.concat(games);
      } else {
        console.log(`📂 发现 ${categoryTabs.length} 个分类`);
        console.log('');
        
        for (let i = 0; i < categoryTabs.length; i++) {
          const tab = categoryTabs[i];
          const categoryName = tab.textContent.replace(/共\d+种商品/, '').replace(/包含\d+件商品/, '').trim();
          
          if (!categoryName || categoryName.includes('共0种')) continue;
          
          this.currentCategory = categoryName;
          
          // 点击分类
          console.log(`📂 [${i + 1}/${categoryTabs.length}] 切换到分类: ${categoryName}`);
          tab.click();
          
          // 等待页面加载
          await this.wait(2000);
          
          // 抓取游戏
          const games = this.scrapeGames();
          this.games = this.games.concat(games);
          
          console.log('');
        }
      }
      
      console.log('========================');
      console.log(`✅ 抓取完成！共 ${this.games.length} 个游戏`);
      console.log('');
      
      this.outputResult();
    },
    
    /**
     * 输出结果
     */
    outputResult() {
      // 生成完整的 games.json 结构
      const categories = [
        {"id": "all", "name": "全部游戏", "icon": "🎮"},
        {"id": "douyin", "name": "抖音爆火", "icon": "🔥"},
        {"id": "app", "name": "APP精选", "icon": "📱"},
        {"id": "free", "name": "免费解压", "icon": "🆓"},
        {"id": "gm", "name": "GM特权", "icon": "👑"},
        {"id": "vip", "name": "全站畅玩", "icon": "💎"}
      ];
      
      const tags = [
        {"id": "hot", "name": "抖音爆款", "color": "#ff4757"},
        {"id": "free", "name": "免费", "color": "#2ed573"},
        {"id": "no-ad", "name": "免广告", "color": "#1e90ff"},
        {"id": "gm", "name": "GM特权", "color": "#ffa502"},
        {"id": "relax", "name": "解压", "color": "#7bed9f"},
        {"id": "horror", "name": "恐怖", "color": "#57606f"},
        {"id": "sim", "name": "模拟", "color": "#70a1ff"},
        {"id": "puzzle", "name": "益智", "color": "#5352ed"},
        {"id": "action", "name": "动作", "color": "#ff6348"},
        {"id": "casual", "name": "休闲", "color": "#2ed573"},
        {"id": "tower", "name": "塔防", "color": "#ff9f43"},
        {"id": "food", "name": "美食", "color": "#ff6b81"}
      ];
      
      const result = {
        version: "1.0",
        updated: new Date().toISOString().split('T')[0],
        categories: categories,
        tags: tags,
        games: this.games
      };
      
      const jsonStr = JSON.stringify(result, null, 2);
      
      console.log('📋 输出数据预览 (前1000字符):');
      console.log(jsonStr.substring(0, 1000));
      console.log('...');
      console.log('');
      console.log('📥 复制下方完整 JSON 保存到 data/games.json:');
      console.log('');
      
      // 创建可复制到剪贴板的内容
      const copyText = document.createElement('textarea');
      copyText.value = jsonStr;
      copyText.style.position = 'fixed';
      copyText.style.opacity = '0';
      document.body.appendChild(copyText);
      copyText.select();
      document.execCommand('copy');
      document.body.removeChild(copyText);
      
      console.log('✅ JSON 已复制到剪贴板！');
      console.log('');
      console.log('📊 统计信息:');
      
      // 统计各分类数量
      const categoryCount = {};
      this.games.forEach(g => {
        categoryCount[g.category] = (categoryCount[g.category] || 0) + 1;
      });
      
      Object.entries(categoryCount).forEach(([cat, count]) => {
        const catName = categories.find(c => c.id === cat)?.name || cat;
        console.log(`  ${catName}: ${count} 款`);
      });
      
      console.log('');
      console.log('💡 提示:');
      console.log('  1. 将复制的 JSON 粘贴到 data/games.json 文件中');
      console.log('  2. 建议手动核对数据完整性');
      console.log('  3. 可以为游戏添加真实的封面图片链接');
      
      // 同时输出到 window 方便访问
      window._66gmScraperResult = result;
      console.log('');
      console.log('💾 数据也已保存到 window._66gmScraperResult');
    },
    
    /**
     * 等待函数
     */
    wait(ms) {
      return new Promise(resolve => setTimeout(resolve, ms));
    }
  };
  
  // 暴露到全局
  window.scraper = scraper;
  window._66gmScraper = scraper;
  
  // 自动开始抓取
  console.log('');
  console.log('💡 使用说明:');
  console.log('  方法1: 直接运行 scraper.scrapeAllCategories() - 抓取所有分类');
  console.log('  方法2: 运行 scraper.scrapeGames() - 抓取当前页面');
  console.log('  方法3: 切换分类后运行 scraper.scrapeGames() - 逐个抓取');
  console.log('');
  console.log('⚡ 3秒后开始自动抓取...');
  console.log('   (按 Ctrl+C 取消)');
  console.log('');
  
  setTimeout(() => {
    scraper.scrapeAllCategories();
  }, 3000);
  
})();
