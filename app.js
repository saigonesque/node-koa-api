const fetch = require('node-fetch');
const koa = require('koa');
const router = require('koa-router');

const app = new koa();
const _ = router();
const ONE_WEEK_IN_SECONDS = 604800;

const sanitizeText = (text) => {
  let sanitizedText = text.toLowerCase();
  sanitizedText = text.replace(/\./g, ''); // turns u.s.a. into usa, gets rid of trailing periods
  // cleans up punctuation, adds a space just to be safe. Currently treating dashed phrases like multiple words
  sanitizedText = sanitizedText.replace(/[:"“”\,\-\–\?\(\)\[\]]/g, ' ');
  return sanitizedText;
}

const addTitle = (wordCollection, title) => {
  let words = sanitizeText(title).split(" ");
  words.forEach((word) => {
    if (word == '') {
      return;
    }
    word = word.toLowerCase();
    if (!wordCollection[word]) {
      wordCollection[word] = 0;
    }
    wordCollection[word]++;
  });
}

const findTopTenWords = (counter) => {
  let sortedWords = [];
  for (var word in counter) {
    sortedWords.push([
      word, counter[word]
    ]);
  }
  sortedWords.sort((a, b) => {
    return b[1] - a[1];
  })
  return sortedWords.slice(0, 10);
}

const getJSON = async (url) => {
  return await(await fetch(url)).json();
}

// gets the top 10 words in the last 25 hacker news story titles
const topWords25 = async (ctx) => {
  const storiesList = await getJSON('https://hacker-news.firebaseio.com/v0/newstories.json');
  const words = {};
  const getStoryPromises = [];
  for (let i = 0; i < 25; i++) {
    let storyId = storiesList[i];
    getStoryPromises.push(getJSON(`https://hacker-news.firebaseio.com/v0/item/${storyId}.json`));
  }
  const stories = await Promise.all(getStoryPromises); //parallelizes promises for faster execution
  stories.forEach((story) => {
    addTitle(words, story.title);
  });
  ctx.body = findTopTenWords(words);
}

// gets the top 10 words of all hackernews posts in the last week (not replies)
// Steps:
// get index of latest item
// Fetch 250 of the subsequent items simultaneously and go through them
// check to see if time exceeds exactly 1 week
// if yes, stop execution
// if no and is valid type, run addTitle
// repeat until ending condition met
const topWordsWeek = async (ctx) => {
  const currentTime = Math.floor(new Date().getTime() / 1000);
  const words = {};
  // gets latest item
  let itemIndex = await(await fetch('https://hacker-news.firebaseio.com/v0/maxitem.json')).json();
  let weekOldPostFound = false;
  while (!weekOldPostFound) {
    let getItemPromises = [];
    while (getItemPromises.length < 250) {
      getItemPromises.push(getJSON(`https://hacker-news.firebaseio.com/v0/item/${itemIndex}.json`))
      itemIndex--;
    }
    let items = await Promise.all(getItemPromises);
    for (const item of items) {
      if (item !== null && item.time) {
        // check to see if item is older than a week
        if (currentTime - item.time > ONE_WEEK_IN_SECONDS) {
          weekOldPostFound = true;
          break;
        }
        if (item.title) {
          addTitle(words, item.title);
        }
      } else {
        console.log('there was a failure with an item, skipping');
      }
    }

    console.log(itemIndex);
    console.log(words);
  }

  ctx.body = findTopTenWords(words);
}

// Gets the top 10 words for the last 600 stories by authors with over 10,000 karma
// TODO parallelize, it is currently SUPER slow
// Conversion steps: get top 500 new stories at the same time and process valid entries
// Get the id of the last story as a baseline
// Grab the next, say, 250 items and process them simultaneously
// if the number of valid stories is less than 600, repeat
const topWordsExperts = async (ctx) => {
  let itemIndex = await(await fetch('https://hacker-news.firebaseio.com/v0/maxitem.json')).json();
  let numberOfValidStories = 0;
  let words = {};
  while (numberOfValidStories < 600) {
    let item = await(await fetch(`https://hacker-news.firebaseio.com/v0/item/${itemIndex}.json`)).json();
    if (item.type == "story") {
      let authorId = item.by;
      let author = await(await fetch(`https://hacker-news.firebaseio.com/v0/user/${authorId}.json`)).json();
      if (author.karma > 10000) {
        addTitle(words, item.title);
        numberOfValidStories++;
        console.log(words);
        console.log(numberOfValidStories);
      }
    }
    itemIndex--;
  }

  ctx.body = findTopTenWords(words);
}

_.get('/25', topWords25);
_.get('/week', topWordsWeek);
_.get('/experts', topWordsExperts);

app.use(_.routes());
app.listen(3000);
