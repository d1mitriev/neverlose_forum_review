export async function fetchAllComments() {
  try {
        const topicId = '519874';
    
        const topicResponse = await fetch(`/api/proxy-request?url=${encodeURIComponent(`https://forum.neverlose.cc/t/${topicId}.json`)}`);
    const topicData = await topicResponse.json();
    const postsCount = topicData.posts_count;

        const perPage = 20;
    const totalPages = Math.ceil(postsCount / perPage);
    
    console.log(`Всего постов: ${postsCount}, страниц: ${totalPages}`);

        let allPosts = [];
    for (let page = 1; page <= totalPages; page++) {
            const progress = Math.floor((page - 1) / totalPages * 100);
      console.log(`Загрузка: ${progress}% (страница ${page}/${totalPages})`);
      
      const pageUrl = `https://forum.neverlose.cc/t/${topicId}/${page}.json`;
      const pageResponse = await fetch(`/api/proxy-request?url=${encodeURIComponent(pageUrl)}`);
      const pageData = await pageResponse.json();
      
      if (pageData.post_stream && pageData.post_stream.posts) {
        allPosts = allPosts.concat(pageData.post_stream.posts);
      }
      
            await new Promise(resolve => setTimeout(resolve, 500));
    }

        allPosts.sort((a, b) => a.post_number - b.post_number);

        const formattedPosts = allPosts.map(post => ({
      postNumber: post.post_number.toString(),
      username: post.username || 'Unknown',
      timeAgo: new Date(post.created_at).toLocaleString(),
      content: post.cooked ? stripHtml(post.cooked) : '',
      avatar: post.avatar_template 
        ? `https://forum.neverlose.cc${post.avatar_template.replace('{size}', '90')}`
        : 'https://via.placeholder.com/70?text=?'
    }));

    return formattedPosts;
  } catch (error) {
    console.error('Ошибка при загрузке комментариев:', error);
    throw error;
  }
}

function stripHtml(html) {
  const tmp = document.createElement('DIV');
  tmp.innerHTML = html;
  return tmp.textContent || tmp.innerText || '';
} 