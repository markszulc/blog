import { Feed } from 'feed';
import fs from 'fs';
console.log(`loading...`);

/**
 * @type {FeedConfig[]}
 */
const feeds = [
  {
    title: 'MarkSzulc.com News',
    targetFile: `../../news/feed.xml`,
    source: 'https://main--blog--markszulc.hlx.live/query-index.json',
    siteRoot: "https://www.markszulc.com",
    link:	"https://www.markszulc.com/news/",
    language:	"en",
    description: "Get the latest news from Mark."
  }
]


const limit = "1000";

/**
 * @typedef {Object} FeedConfig
 * @property {string} title
 * @property {string} description
 * @property {string} link
 * @property {string} siteRoot
 * @property {string} targetFile
 * @property {string} source
 * @property {string} language
 */


/**
 * @typedef {Object} Post
 * @property {string} title
 * @property {string} summary
 * @property {string} path
 * @property {string} publicationDate
 * @property {string} template
 */

/**
 * @param feed {FeedConfig}
 * @return {Promise<void>}
 */
async function createFeed(feed) {
  const allPosts = await fetchBlogPosts(feed);
  console.log(`found ${allPosts.length} posts`);


  const newestPost = allPosts
    .map((post) => new Date(post.lastModified * 1000))
    .reduce((maxDate, date) => (date > maxDate ? date : maxDate), new Date(0));

  const atomFeed = new Feed({
    title: feed.title,
    description: feed.description,
    id: feed.link,
    link: feed.link,
    updated: newestPost,
    generator: 'AEM News feed generator (GitHub action)',
    language: feed.language,
  });

  allPosts.forEach((post) => {
    const link = feed.siteRoot + post.path;
    atomFeed.addItem({
      title: post.title,
      id: link,
      link,
      content: post.summary,
      date: new Date(post.lastModified * 1000),
      published: new Date(post.lastModified * 1000),
    });
  });

  fs.writeFileSync(feed.targetFile, atomFeed.atom1());
  console.log('wrote file to ', feed.targetFile);
}

/**
 * @param feed {FeedConfig}
 * @return {Promise<Post[]>}
 */
async function fetchBlogPosts(feed) {
  let offset = 0;
  const allPosts = [];
  console.log(`Fetching Blog posts`);
  while (true) {
    const api = new URL(feed.source);
    api.searchParams.append('offset', JSON.stringify(offset));
    api.searchParams.append('limit', limit);
    const response = await fetch(api, {});
    const result = await response.json();

    allPosts.push(...result.data);

    if (result.offset + result.limit < result.total) {
      // there are more pages
      offset = result.offset + result.limit;
    } else {
      break;
    }
  }
  return allPosts;
}

for (const feed of feeds) {
  createFeed(feed)
    .catch((e) => console.error(e));

}
