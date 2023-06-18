export default async function decorate(block) {
  const indexResponse = await fetch('/query-index.json');
  if (!indexResponse.ok) {
    return;
  }

  const index = await indexResponse.json();

  const container = document.createElement('ul');
  
  let featurecount = 0;

  index.data
    .forEach((post) => {

      if (post.category == 'livestream') {

      if (featurecount < 3) {

      const li = document.createElement('li');


      const eager = false;
      const picture = createOptimizedPicture(post.image, post.title || title, eager, [{ width: '750' }]);
      const pictureTag = picture.outerHTML;
      const card = document.createElement('a');
      card.className = `foo-card`;
      card.href = "#";

      li.innerHTML = `
      <a href="${post.path}">
          ${pictureTag}
          <h4>${post.title}</h4>
      </a>
    `;
      container.append(li);
      console.log("LiveStream: " + featurecount);
      featurecount++;
    }
  }
});



  block.append(container);
}


export function createOptimizedPicture(src, alt = '', eager = false, breakpoints = [{ media: '(min-width: 400px)', width: '2000' }, { width: '750' }]) {
  const url = new URL(src, window.location.href);
  const picture = document.createElement('picture');
  const { pathname } = url;
  const ext = pathname.substring(pathname.lastIndexOf('.') + 1);

  // webp
  breakpoints.forEach((br) => {
    const source = document.createElement('source');
    if (br.media) source.setAttribute('media', br.media);
    source.setAttribute('type', 'image/webp');
    source.setAttribute('srcset', `${pathname}?width=${br.width}&format=webply&optimize=medium`);
    picture.appendChild(source);
  });

  // fallback
  breakpoints.forEach((br, i) => {
    if (i < breakpoints.length - 1) {
      const source = document.createElement('source');
      if (br.media) source.setAttribute('media', br.media);
      source.setAttribute('srcset', `${pathname}?width=${br.width}&format=${ext}&optimize=medium`);
      picture.appendChild(source);
    } else {
      const img = document.createElement('img');
      img.setAttribute('src', `${pathname}?width=${br.width}&format=${ext}&optimize=medium`);
      img.setAttribute('loading', eager ? 'eager' : 'lazy');
      img.setAttribute('alt', alt);
      picture.appendChild(img);
    }
  });

  return picture;
}