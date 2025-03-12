require('dotenv').config();
const { 
    Client, 
    GatewayIntentBits, 
    EmbedBuilder,
    REST,
    Routes,
    SlashCommandBuilder,
    ActionRowBuilder,
    ButtonBuilder,
    ButtonStyle,
    ModalBuilder,
    TextInputBuilder,
    TextInputStyle
} = require('discord.js');
const puppeteer = require('puppeteer');
const fs = require('fs');

const config = {
    discordToken: process.env.DISCORD_TOKEN,
    channelId: process.env.CHANNEL_ID,
    forumUrl: 'https://forum.neverlose.cc/t/24-7-unique-resell-ua-ru-kz-ua-cards-ru-cards-kz-cards-binance-pay-bybit-uid-htx-id/519874',
    checkInterval: 5 * 60 * 1000,     dataFile: './lastChecked.json'
};

const client = new Client({ 
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent
    ]
});

let lastCheckedData = {
    lastPostId: 0,
    lastPostNumber: 0
};

const commands = [
    new SlashCommandBuilder()
        .setName('check')
        .setDescription('Проверить наличие новых отзывов на форуме')
        .toJSON(),
    new SlashCommandBuilder()
        .setName('lastreview')
        .setDescription('Показать последний отзыв с форума')
        .toJSON(),
    new SlashCommandBuilder()
        .setName('verify')
        .setDescription('Проверить, принадлежит ли отзыв пользователю')
        .addStringOption(option => 
            option.setName('url')
                .setDescription('Ссылка на отзыв')
                .setRequired(true))
        .addStringOption(option => 
            option.setName('username')
                .setDescription('Имя пользователя на форуме')
                .setRequired(true))
        .toJSON(),
    new SlashCommandBuilder()
        .setName('checkcomment')
        .setDescription('Открыть форму для проверки комментария')
        .toJSON(),
    new SlashCommandBuilder()
        .setName('collect')
        .setDescription('Собрать все комментарии из темы и сохранить в кэш')
        .toJSON()
];

async function registerCommands() {
    try {
        const rest = new REST({ version: '10' }).setToken(config.discordToken);
        
        console.log('Начинаем регистрацию slash-команд...');
        
        const appId = client.application.id;
        
        await rest.put(
            Routes.applicationCommands(appId),
            { body: [] }
        );
        
        console.log('Существующие команды удалены, регистрируем новые...');
        
        await rest.put(
            Routes.applicationCommands(appId),
            { body: commands }
        );
        
        console.log('Slash-команды успешно зарегистрированы!');
    } catch (error) {
        console.error('Ошибка при регистрации команд:', error);
    }
}

function loadLastCheckedData() {
    try {
        if (fs.existsSync(config.dataFile)) {
            const data = fs.readFileSync(config.dataFile, 'utf8');
            lastCheckedData = JSON.parse(data);
            console.log('Загружены данные о последней проверке:', lastCheckedData);
        }
    } catch (error) {
        console.error('Ошибка при загрузке данных о последней проверке:', error);
    }
}

function saveLastCheckedData() {
    try {
        fs.writeFileSync(config.dataFile, JSON.stringify(lastCheckedData), 'utf8');
        console.log('Данные о последней проверке сохранены');
    } catch (error) {
        console.error('Ошибка при сохранении данных о последней проверке:', error);
    }
}

async function fetchReviews() {
    let browser = null;
    try {
        console.log('Запуск браузера...');
        browser = await puppeteer.launch({
            headless: 'new',
            args: ['--no-sandbox', '--disable-setuid-sandbox']
        });

        const page = await browser.newPage();
        await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36');
        

        console.log(`Получаем данные API: ${config.forumUrl}.json`);
        
        const urlParts = config.forumUrl.split('/');
        const topicId = urlParts[urlParts.length - 1];
        const jsonUrl = `${config.forumUrl}.json`;
        
        await page.goto(jsonUrl, { waitUntil: 'networkidle2' });
        
        const topicData = await page.evaluate(() => {
            return JSON.parse(document.body.textContent);
        });
        
        const totalPosts = topicData.posts_count || 0;
        console.log(`Всего постов в теме: ${totalPosts}`);
        
        if (totalPosts === 0) {
            return [];
        }
        
        const postsPerPage = 20;
        const desiredPosts = 30;
        
        const lastPage = Math.ceil(totalPosts / postsPerPage);
        
        const pageUrl = `${config.forumUrl}?page=${lastPage}`;
        console.log(`Загружаем последнюю страницу: ${pageUrl}`);
        
        await page.goto(pageUrl, { waitUntil: 'networkidle2' });
        await page.waitForSelector('.topic-post');
        
        const reviews = await page.evaluate((forumUrl) => {
            const postElements = document.querySelectorAll('.topic-post');
            return Array.from(postElements).map(post => {
                const usernameElement = post.querySelector('.username a');
                const timeElement = post.querySelector('.relative-date');
                const contentElement = post.querySelector('.cooked');
                const postIdAttr = post.getAttribute('data-post-id');
                const postNumber = post.getAttribute('data-post-number') || '';
                
                return {
                    postId: postIdAttr || '',
                    postNumber: postNumber,
                    username: usernameElement ? usernameElement.textContent.trim() : 'Неизвестный пользователь',
                    timeAgo: timeElement ? timeElement.textContent.trim() : 'Неизвестно',
                    content: contentElement ? contentElement.textContent.trim() : 'Пустой отзыв',
                    postUrl: `${forumUrl}/${postNumber}`
                };
            });
        }, config.forumUrl);
        
        console.log(`Найдено ${reviews.length} отзывов на последней странице`);
        return reviews;
    } catch (error) {
        console.error('Ошибка при получении отзывов:', error);
        return [];
    } finally {
        if (browser) {
            await browser.close();
            console.log('Браузер закрыт');
        }
    }
}

async function sendNewReviews(reviews) {
    if (!reviews || reviews.length === 0) {
        console.log('Нет отзывов для проверки');
        return 0;
    }

    const channel = client.channels.cache.get(config.channelId);
    if (!channel) {
        console.error('Канал не найден:', config.channelId);
        return 0;
    }

    const newReviews = reviews.filter(review => {
        return parseInt(review.postId, 10) > lastCheckedData.lastPostId;
    });

    if (newReviews.length === 0) {
        console.log('Новых отзывов не найдено');
        return 0;
    }

    console.log(`Найдено ${newReviews.length} новых отзывов`);

    for (const review of newReviews) {
        const embed = new EmbedBuilder()
            .setColor('#0b1622') 
            .setAuthor({
                name: `${review.username}`,
                iconURL: 'https://forum.neverlose.cc/user_avatar/forum.neverlose.cc/' + review.username.toLowerCase() + '/70/1.png'
            })
            .setDescription(review.content)
            .setFooter({ text: `👍 ${review.likeCount || '0'}` })
            .setTimestamp(review.dateISO ? new Date(parseInt(review.dateISO)) : null);

        await channel.send({ embeds: [embed] });
        
        lastCheckedData.lastPostId = parseInt(review.postId, 10);
        lastCheckedData.lastPostNumber = parseInt(review.postNumber, 10);
    }

    saveLastCheckedData();
    
    return newReviews.length;
}

async function checkForNewReviews() {
    console.log('Проверка новых отзывов...');
    try {
        const reviews = await fetchReviews();
        return await sendNewReviews(reviews);
    } catch (error) {
        console.error('Ошибка при проверке новых отзывов:', error);
        return 0;
    }
}


async function getLastReview() {
    try {
        console.log('Получение последнего отзыва...');
        const reviews = await fetchReviews();
        
        if (!reviews || reviews.length === 0) {
            console.log('Не найдено отзывов');
            return null;
        }
        
                reviews.forEach((review, index) => {
            console.log(`Отзыв #${index}: от ${review.username}, timeAgo=${review.timeAgo}, postNumber=${review.postNumber}`);
        });
        
        function timeAgoToMinutes(timeAgo) {
            if (!timeAgo) return Number.MAX_SAFE_INTEGER;
            
            const match = timeAgo.match(/(\d+)(\w+)/);
            if (!match) return Number.MAX_SAFE_INTEGER;
            
            const value = parseInt(match[1], 10);
            const unit = match[2];
            
            if (unit.includes('h')) return value * 60;                     if (unit.includes('m')) return value;                          if (unit.includes('d')) return value * 60 * 24;                
            return Number.MAX_SAFE_INTEGER;
        }
        
        const sortedReviews = [...reviews].sort((a, b) => {
            return timeAgoToMinutes(a.timeAgo) - timeAgoToMinutes(b.timeAgo);
        });
        
        if (sortedReviews.length > 0) {
            const newestReview = sortedReviews[0];
            console.log(`Найден самый последний отзыв от ${newestReview.username} (${newestReview.timeAgo})`);
            return newestReview;
        }
        
        return null;
    } catch (error) {
        console.error('Ошибка при получении последнего отзыва:', error);
        return null;
    }
}

async function sendLastReviewEmbed(interaction) {
    await interaction.deferReply();
    
    const lastReview = await getLastReview();
    
    if (!lastReview) {
        await interaction.editReply('Не удалось получить последний отзыв с форума.');
        return;
    }
    
    const embed = new EmbedBuilder()
        .setColor('#0b1622') 
        .setAuthor({
            name: `${lastReview.username || 'Неизвестный'}`,
            iconURL: 'https://forum.neverlose.cc/user_avatar/forum.neverlose.cc/' + (lastReview.username || 'unknown').toLowerCase() + '/70/1.png'
        })
        .setDescription(lastReview.content || 'Содержимое отзыва недоступно')
        .setFooter({ text: `👍 ${lastReview.likeCount || '0'}` })
        .setTimestamp(lastReview.dateISO ? new Date(parseInt(lastReview.dateISO)) : null);
    
    await interaction.editReply({ embeds: [embed] });
}

async function handleCheckCommand(interaction) {
    const embed = new EmbedBuilder()
        .setColor('#0099ff')
        .setTitle('Проверка отзывов на форуме')
        .setDescription('Нажмите кнопку ниже, чтобы проверить наличие новых отзывов на форуме Neverlose.cc')
        .setTimestamp();
    
    const checkButton = new ButtonBuilder()
        .setCustomId('check_reviews')
        .setLabel('Проверить отзывы')
        .setStyle(ButtonStyle.Primary)
        .setEmoji('🔍');
    
    const lastReviewButton = new ButtonBuilder()
        .setCustomId('last_review')
        .setLabel('Показать последний отзыв')
        .setStyle(ButtonStyle.Secondary)
        .setEmoji('📝');
    
    const row = new ActionRowBuilder().addComponents(checkButton, lastReviewButton);
    
    await interaction.reply({ embeds: [embed], components: [row] });
}

async function handleLastReviewButton(interaction) {
    await sendLastReviewEmbed(interaction);
}

async function handleCheckButton(interaction) {
    await interaction.deferReply({ ephemeral: true });
    
    try {
        const count = await checkForNewReviews();
        
        if (count === 0) {
            await interaction.editReply({ content: 'Новых отзывов не найдено.', ephemeral: true });
        } else {
            await interaction.editReply({ 
                content: `Найдено и отправлено ${count} новых отзывов.`, 
                ephemeral: true 
            });
        }
    } catch (error) {
        console.error('Ошибка при обработке кнопки проверки:', error);
        await interaction.editReply({ 
            content: 'Произошла ошибка при проверке отзывов. Подробности в логах бота.', 
            ephemeral: true 
        });
    }
}

async function getReviewByPostNumber(topicId, postNumber) {
    let browser;
    try {
        console.log(`Получение комментария с номером: ${postNumber} в теме ${topicId}`);
        
        browser = await puppeteer.launch({
            headless: 'new',
            args: ['--no-sandbox', '--disable-setuid-sandbox']
        });
        
        const page = await browser.newPage();
        await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36');
        
        const directUrl = `https://forum.neverlose.cc/t/24-7-unique-resell-ua-ru-kz-ua-cards-ru-cards-kz-cards-binance-pay-bybit-uid-htx-id/${topicId}/${postNumber}`;
        console.log(`Переходим на страницу с комментарием: ${directUrl}`);
        
        await page.goto(directUrl, { waitUntil: 'networkidle2', timeout: 60000 });
        
        await page.screenshot({ path: `comment-${postNumber}.png` });
        
        const review = await page.evaluate((targetNumber) => {
            const postSelector = `#post_${targetNumber}`;
            const post = document.querySelector(postSelector);
            
            if (!post) {
                console.log(`Пост с селектором ${postSelector} не найден`);
                return null;
            }
            
            const username = post.querySelector('.username a')?.textContent.trim() || '';
            const timeAgo = post.querySelector('.relative-date')?.textContent.trim() || '';
            const content = post.querySelector('.cooked')?.textContent.trim() || '';
            let avatar = post.querySelector('.avatar')?.getAttribute('src') || '';
            
            if (avatar && avatar.startsWith('/')) {
                avatar = 'https://forum.neverlose.cc' + avatar;
            }
            
            return {
                postNumber: targetNumber,
                username,
                timeAgo,
                content,
                avatar
            };
        }, postNumber);
        
        if (review) {
            console.log(`Найден комментарий от ${review.username}: ${review.content.substring(0, 50)}...`);
            return review;
        } else {
            console.log(`Комментарий с номером ${postNumber} не найден`);
            return null;
        }
    } catch (error) {
        console.error('Ошибка при получении комментария:', error);
        return null;
    } finally {
        if (browser) await browser.close();
    }
}

function extractPostInfoFromUrl(url) {
    try {
                        const regex = /\/t\/.*?\/(\d+)\/(\d+)(?:\?|$)/;
        const match = url.match(regex);
        
        if (match && match.length >= 3) {
            return {
                topicId: match[1],
                postNumber: match[2]
            };
        }
        
        return null;
    } catch (error) {
        console.error('Ошибка при извлечении информации из URL:', error);
        return null;
    }
}


const reviewsCacheFile = './reviewsCache.json';

async function loadReviewsCache() {
    try {
        if (fs.existsSync(reviewsCacheFile)) {
            const data = fs.readFileSync(reviewsCacheFile, 'utf8');
            return JSON.parse(data) || [];
        }
        return [];
    } catch (error) {
        console.error('Ошибка при загрузке кэша комментариев:', error);
        return [];
    }
}

async function saveReviewsCache(cache) {
    try {
        fs.writeFileSync(reviewsCacheFile, JSON.stringify(cache, null, 2), 'utf8');
        console.log(`Кэш комментариев обновлен, всего ${cache.length} комментариев`);
    } catch (error) {
        console.error('Ошибка при сохранении кэша комментариев:', error);
    }
}

async function findReviewInCache(postNumber) {
    const cache = await loadReviewsCache();
    return cache.find(review => review.postNumber === postNumber);
}

async function addReviewToCache(review) {
    const cache = await loadReviewsCache();
        const existingIndex = cache.findIndex(r => r.postNumber === review.postNumber);
    
    if (existingIndex >= 0) {
                cache[existingIndex] = review;
    } else {
        cache.push(review);
    }
    
    await saveReviewsCache(cache);
}

async function getTotalTopicPagesOptimized() {
    let browser;
    try {
        browser = await puppeteer.launch({
            headless: 'new',
            args: ['--no-sandbox', '--disable-setuid-sandbox']
        });
        
        const page = await browser.newPage();
        
        await page.setRequestInterception(true);
        page.on('request', (req) => {
            const resourceType = req.resourceType();
            if (resourceType === 'image' || resourceType === 'font' || resourceType === 'stylesheet') {
                req.abort();
            } else {
                req.continue();
            }
        });
        
        await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36');
        
        const jsonUrl = `${config.forumUrl}.json`;
        console.log(`Получаем метаданные темы: ${jsonUrl}`);
        
        await page.goto(jsonUrl, { waitUntil: 'networkidle2', timeout: 30000 });
        
        const topicInfo = await page.evaluate(() => {
            return JSON.parse(document.body.textContent);
        });
        
        const postsCount = topicInfo.posts_count || 0;
        const postsPerPage = 20;
        const totalPages = Math.ceil(postsCount / postsPerPage);
        
        console.log(`Общее количество постов: ${postsCount}, всего страниц: ${totalPages}`);
        
        return { totalPages, postsCount };
    } catch (error) {
        console.error('Ошибка при получении информации о теме:', error);
        return { totalPages: 0, postsCount: 0 };
    } finally {
        if (browser) await browser.close();
    }
}

async function fetchPageReviewsOptimized(pageNumber, browser) {
    try {
        const page = await browser.newPage();
        
                await page.setRequestInterception(true);
        page.on('request', (req) => {
            const resourceType = req.resourceType();
            if (resourceType === 'image' || resourceType === 'font' || resourceType === 'stylesheet') {
                req.abort();
            } else {
                req.continue();
            }
        });
        
        await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36');
        
        const pageUrl = `${config.forumUrl}?page=${pageNumber}`;
        console.log(`Загружаем страницу ${pageNumber}: ${pageUrl}`);
        
        await page.goto(pageUrl, { waitUntil: 'domcontentloaded', timeout: 30000 });
        
        await page.waitForSelector('.topic-post', { timeout: 30000 })
            .catch(err => console.log(`Ошибка ожидания постов на странице ${pageNumber}: ${err.message}`));
        
        const reviews = await page.evaluate((forumUrl) => {
            const postElements = document.querySelectorAll('.topic-post');
            return Array.from(postElements).map(post => {
                const postNumber = post.getAttribute('data-post-number') || '';
                const usernameElement = post.querySelector('.username a');
                const username = usernameElement ? usernameElement.textContent.trim() : 'Неизвестный пользователь';
                const timeElement = post.querySelector('.relative-date');
                const timeAgo = timeElement ? timeElement.textContent.trim() : 'Неизвестно';
                const contentElement = post.querySelector('.cooked');
                const content = contentElement ? contentElement.textContent.trim() : 'Пустой отзыв';
                
                return {
                    postNumber,
                    username,
                    timeAgo,
                    content,
                    postUrl: `${forumUrl}/${postNumber}`
                };
            });
        }, config.forumUrl);
        
        await page.close();
        console.log(`Собрано ${reviews.length} комментариев со страницы ${pageNumber}`);
        return reviews;
    } catch (error) {
        console.error(`Ошибка при получении комментариев со страницы ${pageNumber}:`, error);
        return [];
    }
}


async function handleCollectCommand(interaction) {
    await interaction.deferReply({ ephemeral: true });
    
    let browser;
    let progressMessage = await interaction.editReply('Начинаю сбор всех комментариев...');
    
    try {
        browser = await puppeteer.launch({
            headless: 'new',
            args: ['--no-sandbox', '--disable-setuid-sandbox']
        });
        
        const { totalPages, postsCount } = await getTotalTopicPagesOptimized();
        
        if (totalPages === 0) {
            await interaction.editReply('Не удалось определить количество страниц в теме.');
            return;
        }
        
        let cachedReviews = await loadReviewsCache();
        const cachedCount = cachedReviews.length;
        
        await interaction.editReply(`Всего страниц: ${totalPages}, комментариев: ${postsCount}. В кэше: ${cachedCount}. Начинаю сбор...`);
        
        const cachedPostNumbers = new Set(cachedReviews.map(r => r.postNumber));
        
        let newReviews = [];
        
        const batchSize = 3;
        const estimatedTimePerPage = 5;
        
        for (let startPage = 1; startPage <= totalPages; startPage += batchSize) {
            const endPage = Math.min(startPage + batchSize - 1, totalPages);
            const pagesInBatch = endPage - startPage + 1;
            
            const progressPercent = Math.round((startPage / totalPages) * 100);
            const estimatedTimeRemaining = Math.round(((totalPages - startPage + 1) / batchSize) * estimatedTimePerPage * batchSize);
            
            await interaction.editReply(
                `Прогресс: ${progressPercent}% (страницы ${startPage}-${endPage} из ${totalPages})\n` +
                `Собрано новых комментариев: ${newReviews.length}\n` +
                `Примерное оставшееся время: ${estimatedTimeRemaining} секунд`
            );
            
            const pagePromises = [];
            for (let page = startPage; page <= endPage; page++) {
                pagePromises.push(fetchPageReviewsOptimized(page, browser));
            }
            
            const pageResults = await Promise.all(pagePromises);
            
            for (const reviews of pageResults) {
                for (const review of reviews) {
                    if (!cachedPostNumbers.has(review.postNumber)) {
                        newReviews.push(review);
                        cachedPostNumbers.add(review.postNumber);
                    }
                }
            }
            
            if (newReviews.length > 0 && (newReviews.length % 100 === 0 || endPage === totalPages)) {
                const combinedReviews = [...cachedReviews, ...newReviews];
                await saveReviewsCache(combinedReviews);
                cachedReviews = combinedReviews;
                newReviews = [];
                
                await interaction.editReply(
                    `Прогресс: ${progressPercent}% (страницы ${startPage}-${endPage} из ${totalPages})\n` +
                    `Сохранено в кэш: ${cachedReviews.length} комментариев\n` +
                    `Примерное оставшееся время: ${estimatedTimeRemaining} секунд`
                );
            }
        }
        
        const finalCount = cachedReviews.length;
        const newCount = finalCount - cachedCount;
        
        await interaction.editReply(
            `✅ Сбор комментариев завершен!\n` +
            `Всего в кэше: ${finalCount} комментариев\n` +
            `Новых комментариев добавлено: ${newCount}\n` +
            `Все комментарии сохранены в файл: ${reviewsCacheFile}`
        );
    } catch (error) {
        console.error('Ошибка при сборе комментариев:', error);
        await interaction.editReply('Произошла ошибка при сборе комментариев. Проверьте консоль для деталей.');
    } finally {
        if (browser) await browser.close();
    }
}

async function verifyReview(interaction) {
    await interaction.deferReply({ ephemeral: true });
    
    const url = interaction.options.getString('url');
    const claimedUsername = interaction.options.getString('username').toLowerCase();
    
    console.log(`Проверка отзыва: URL=${url}, заявленный пользователь=${claimedUsername}`);
    
    const postInfo = extractPostInfoFromUrl(url);
    if (!postInfo) {
        await interaction.editReply({ 
            content: 'Не удалось извлечь информацию о посте из предоставленной ссылки. Убедитесь, что ссылка имеет правильный формат (например, https://forum.neverlose.cc/t/topic-name/519874/2214).',
            ephemeral: true 
        });
        return;
    }
    
    console.log(`Извлечена информация: topicId=${postInfo.topicId}, postNumber=${postInfo.postNumber}`);
    
    const review = await getReviewByPostNumber(postInfo.topicId, postInfo.postNumber);
    if (!review) {
        await interaction.editReply({ 
            content: 'Не удалось найти отзыв по указанной ссылке. Возможно, отзыв был удален или ссылка неверна.',
            ephemeral: true 
        });
        return;
    }
    
    const actualUsername = review.username.toLowerCase();
    const isVerified = actualUsername === claimedUsername;
    
    console.log(`Проверка: фактический пользователь=${actualUsername}, заявленный=${claimedUsername}, результат=${isVerified}`);
    
    const embed = new EmbedBuilder()
        .setColor(isVerified ? '#00b74a' : '#f93154')
        .setTitle(isVerified ? '✅ Отзыв подтвержден' : '❌ Отзыв не подтвержден')
        .setDescription(isVerified 
            ? `Подтверждено, что отзыв действительно был оставлен пользователем **${review.username}**`
            : `Отзыв был оставлен пользователем **${review.username}**, а не **${claimedUsername}**`)
        .addFields(
            { name: 'Номер поста', value: `#${review.postNumber}` },
            { name: 'Содержание отзыва', value: review.content.substring(0, 1024) || 'Пустой отзыв' },
            { name: 'Время публикации', value: review.timeAgo || 'Неизвестно' }
        )
        .setTimestamp();
    
    if (review.avatar) {
        embed.setThumbnail(review.avatar);
    }
    
    await interaction.editReply({ embeds: [embed], ephemeral: true });
    
    if (isVerified) {
        const channel = interaction.channel;
        const publicEmbed = new EmbedBuilder()
            .setColor('#00b74a')
            .setTitle('✅ Отзыв подтвержден')
            .setDescription(`Пользователь ${interaction.user.toString()} подтвердил свой отзыв на форуме Neverlose.cc`)
            .addFields(
                { name: 'Имя на форуме', value: review.username },
                { name: 'Номер отзыва', value: `#${review.postNumber}` },
                { name: 'Содержание отзыва', value: review.content.substring(0, 1024) || 'Пустой отзыв' },
                { name: 'Опубликован', value: review.timeAgo || 'Неизвестно' }
            )
            .setTimestamp();
        
        if (review.avatar) {
            if (review.avatar.startsWith('/')) {
                review.avatar = 'https://forum.neverlose.cc' + review.avatar;
            }
            if (review.avatar.startsWith('http://') || review.avatar.startsWith('https://')) {
                publicEmbed.setThumbnail(review.avatar);
            }
        }
        
        await channel.send({ embeds: [publicEmbed] });
    }
}

function createCommentCheckModal() {
    const modal = new ModalBuilder()
        .setCustomId('verify-comment-modal')
        .setTitle('Проверка комментария');
    
    const urlInput = new TextInputBuilder()
        .setCustomId('commentUrl')
        .setLabel('Ссылка на комментарий')
        .setPlaceholder('https://forum.neverlose.cc/t/topic/519874/2214')
        .setStyle(TextInputStyle.Short)
        .setRequired(true);
    
    const usernameInput = new TextInputBuilder()
        .setCustomId('commentUsername')
        .setLabel('Имя пользователя на форуме')
        .setPlaceholder('Введите точное имя пользователя на форуме')
        .setStyle(TextInputStyle.Short)
        .setRequired(true);
    
    const firstActionRow = new ActionRowBuilder().addComponents(urlInput);
    const secondActionRow = new ActionRowBuilder().addComponents(usernameInput);
    
    modal.addComponents(firstActionRow, secondActionRow);
    
    return modal;
}

function createCommentCheckButton() {
    const button = new ButtonBuilder()
        .setCustomId('check_comment')
        .setLabel('Проверить комментарий')
        .setStyle(ButtonStyle.Primary)
        .setEmoji('🔍');
    
    return button;
}

async function handleCheckCommentCommand(interaction) {
    try {
        const modal = createCommentCheckModal();
        await interaction.showModal(modal);
    } catch (error) {
        console.error('Ошибка при отображении модального окна:', error);
        await interaction.reply({ 
            content: 'Произошла ошибка при открытии формы проверки. Пожалуйста, попробуйте позже.',
            ephemeral: true 
        });
    }
}

async function handleCheckCommentButton(interaction) {
    try {
        const modal = createCommentCheckModal();
        await interaction.showModal(modal);
    } catch (error) {
        console.error('Ошибка при отображении модального окна:', error);
        await interaction.reply({ 
            content: 'Произошла ошибка при открытии формы проверки. Пожалуйста, попробуйте позже.',
            ephemeral: true 
        });
    }
}

async function handleModalSubmit(interaction) {
    try {
        if (interaction.customId !== 'verify-comment-modal') return;
        if (interaction.customId !== 'verify-comment-modal') return;
        
        await interaction.deferReply({ ephemeral: true });
        
        const url = interaction.fields.getTextInputValue('commentUrl');
        const claimedUsername = interaction.fields.getTextInputValue('commentUsername').toLowerCase();
        
        console.log(`Проверка комментария из модального окна: URL=${url}, пользователь=${claimedUsername}`);
        
        const postInfo = extractPostInfoFromUrl(url);
        if (!postInfo) {
            await interaction.editReply({ 
                content: 'Не удалось извлечь информацию о посте из предоставленной ссылки. Убедитесь, что ссылка имеет правильный формат (например, https://forum.neverlose.cc/t/topic-name/519874/2214).',
                ephemeral: true 
            });
            return;
        }
        
        console.log(`Извлечена информация: topicId=${postInfo.topicId}, postNumber=${postInfo.postNumber}`);
        
        const review = await getReviewByPostNumber(postInfo.topicId, postInfo.postNumber);
        if (!review) {
            await interaction.editReply({ 
                content: 'Не удалось найти комментарий по указанной ссылке. Возможно, комментарий был удален или ссылка неверна.',
                ephemeral: true 
            });
            return;
        }
        
        const actualUsername = review.username.toLowerCase();
        const isVerified = actualUsername === claimedUsername;
        
        console.log(`Проверка: фактический пользователь=${actualUsername}, заявленный=${claimedUsername}, результат=${isVerified}`);
        
        const embed = new EmbedBuilder()
            .setColor(isVerified ? '#00b74a' : '#f93154')              .setTitle(isVerified ? '✅ Комментарий подтвержден' : '❌ Комментарий не подтвержден')
            .setDescription(isVerified 
                ? `Подтверждено, что комментарий действительно был оставлен пользователем **${review.username}**`
                : `Комментарий был оставлен пользователем **${review.username}**, а не **${claimedUsername}**`)
            .addFields(
                { name: 'Номер поста', value: `#${review.postNumber}` },
                { name: 'Содержание комментария', value: review.content.substring(0, 1024) || 'Пустой комментарий' },
                { name: 'Время публикации', value: review.timeAgo || 'Неизвестно' }
            )
            .setTimestamp();
        

        if (review.avatar) {
            if (review.avatar.startsWith('/')) {
                review.avatar = 'https://forum.neverlose.cc' + review.avatar;
            }
            if (review.avatar.startsWith('http://') || review.avatar.startsWith('https://')) {
                embed.setThumbnail(review.avatar);
            }
        }
        
        await interaction.editReply({ embeds: [embed], ephemeral: true });
        
        if (isVerified) {
            const channel = interaction.channel;
            const publicEmbed = new EmbedBuilder()
                .setColor('#00b74a')
                .setTitle('✅ Комментарий подтвержден')
                .setDescription(`Пользователь ${interaction.user.toString()} подтвердил свой комментарий на форуме Neverlose.cc`)
                .addFields(
                    { name: 'Имя на форуме', value: review.username },
                    { name: 'Номер комментария', value: `#${review.postNumber}` },
                    { name: 'Содержание комментария', value: review.content.substring(0, 1024) || 'Пустой комментарий' },
                    { name: 'Опубликован', value: review.timeAgo || 'Неизвестно' }
                )
                .setTimestamp();
            
            if (review.avatar) {
                if (review.avatar.startsWith('/')) {
                    review.avatar = 'https://forum.neverlose.cc' + review.avatar;
                }
                if (review.avatar.startsWith('http://') || review.avatar.startsWith('https://')) {
                    publicEmbed.setThumbnail(review.avatar);
                }
            }
            
            await channel.send({ embeds: [publicEmbed] });
        }
    } catch (error) {
        console.error('Ошибка при обработке модального окна:', error);
        
        if (interaction.deferred || interaction.replied) {
            await interaction.editReply({ 
                content: 'Произошла ошибка при проверке комментария. Пожалуйста, попробуйте позже.',
                ephemeral: true 
            });
        } else {
            await interaction.reply({ 
                content: 'Произошла ошибка при проверке комментария. Пожалуйста, попробуйте позже.',
                ephemeral: true 
            });
        }
    }
}

async function sendCheckCommentButton(interaction) {
    const row = new ActionRowBuilder().addComponents(createCommentCheckButton());
    
    await interaction.reply({
        content: '**Проверка комментариев с форума Neverlose.cc**\nНажмите кнопку ниже, чтобы открыть форму проверки комментария:',
        components: [row]
    });
}

client.on('interactionCreate', async interaction => {
    if (interaction.isChatInputCommand()) {
        if (interaction.commandName === 'check') {
            await handleCheckCommand(interaction);
        } 
        else if (interaction.commandName === 'lastreview') {
            await sendLastReviewEmbed(interaction);
        }
        else if (interaction.commandName === 'verify') {
            await verifyReview(interaction);
        }
        else if (interaction.commandName === 'checkcomment') {
            await handleCheckCommentCommand(interaction);
        }
        else if (interaction.commandName === 'collect') {
            await handleCollectCommand(interaction);
        }
    }
    
    if (interaction.isButton()) {
        if (interaction.customId === 'check_reviews') {
            await handleCheckButton(interaction);
        } 
        else if (interaction.customId === 'last_review') {
            await handleLastReviewButton(interaction);
        }
        else if (interaction.customId === 'check_comment') {
            await handleCheckCommentButton(interaction);
        }
    }
    
    if (interaction.isModalSubmit()) {
        await handleModalSubmit(interaction);
    }
});

client.once('ready', async () => {
    console.log(`Бот ${client.user.tag} запущен!`);
    await registerCommands();
    loadLastCheckedData();
    checkForNewReviews();
    setInterval(checkForNewReviews, config.checkInterval);
});
client.on('messageCreate', async message => {
    if (message.content === '!update-commands' && message.author.id === `839523044682104902`) {
        await message.reply('Начинаю обновление slash-команд...');
        await registerCommands();
        await message.reply('Slash-команды обновлены! Должны появиться в течение нескольких минут.');
    }
});
client.login(config.discordToken); 