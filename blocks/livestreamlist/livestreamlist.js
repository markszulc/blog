import { createOptimizedPicture } from '../../scripts/aem.js';

export default async function decorate(block) {
  const indexResponse = await fetch('/query-index.json');
  if (!indexResponse.ok) {
    return;
  }

  const index = await indexResponse.json();

  const container = document.createElement('ul');

  // Sort index.data by publication-date (most recent first)
  index.data.sort((a, b) => {
    const dateA = new Date(a['publication-date']);
    const dateB = new Date(b['publication-date']);
    return dateB - dateA;
  });

  index.data.forEach((post) => {
    if (post.category !== 'livestream') {
      return;
    }
    const eager = false;
    const title = '';
    const li = document.createElement('li');
    const picture = createOptimizedPicture(post.image, post.title || title, eager, [{ width: '750' }]);
    const pictureTag = picture.outerHTML;

    // Format publication date
    let formattedDate = '';
    if (post['publication-date']) {
      const date = new Date(post['publication-date']);
      if (!isNaN(date.getTime())) {
        formattedDate = date.toLocaleDateString('en-US', {
          year: 'numeric',
          month: 'short',
          day: 'numeric',
        });
      }
    }

    li.innerHTML = `
    <a href="${post.path}">
      ${pictureTag}
      <p class="title">${post.title}</p>
      <p class="description">${post.description}</p>
      ${formattedDate ? `<div class="date"><svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-calendar w-4 h-4" aria-hidden="true"><path d="M8 2v4"></path><path d="M16 2v4"></path><rect width="18" height="18" x="3" y="4" rx="2"></rect><path d="M3 10h18"></path></svg><span class="pubdate">${formattedDate}</span></div>` : ''}
    </a>
  `;
    container.append(li);
  });

  block.append(container);
}
