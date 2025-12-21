// 30 Motivational Sales Quotes
export const salesQuotes = [
  {
    quote: "Every sale has five basic obstacles: no need, no money, no hurry, no desire, no trust.",
    author: "Zig Ziglar",
  },
  {
    quote: "Success is not final, failure is not fatal: it is the courage to continue that counts.",
    author: "Winston Churchill",
  },
  {
    quote: "The difference between a successful person and others is not a lack of strength, not a lack of knowledge, but rather a lack of will.",
    author: "Vince Lombardi",
  },
  {
    quote: "Don't watch the clock; do what it does. Keep going.",
    author: "Sam Levenson",
  },
  {
    quote: "Our greatest weakness lies in giving up. The most certain way to succeed is always to try just one more time.",
    author: "Thomas Edison",
  },
  {
    quote: "The secret of getting ahead is getting started.",
    author: "Mark Twain",
  },
  {
    quote: "I have never worked a day in my life without selling. If I believe in something, I sell it, and I sell it hard.",
    author: "Estee Lauder",
  },
  {
    quote: "Approach each customer with the idea of helping them solve a problem, not selling a product.",
    author: "Brian Tracy",
  },
  {
    quote: "Pretend that every single person you meet has a sign around their neck that says 'Make me feel important.'",
    author: "Mary Kay Ash",
  },
  {
    quote: "Success usually comes to those who are too busy to be looking for it.",
    author: "Henry David Thoreau",
  },
  {
    quote: "The best salespeople know that their expertise can become their enemy in selling.",
    author: "Mike Bosworth",
  },
  {
    quote: "Your attitude, not your aptitude, will determine your altitude.",
    author: "Zig Ziglar",
  },
  {
    quote: "Winning isn't everything, but wanting to win is.",
    author: "Vince Lombardi",
  },
  {
    quote: "I never lose. I either win or learn.",
    author: "Nelson Mandela",
  },
  {
    quote: "The harder the conflict, the more glorious the triumph.",
    author: "Thomas Paine",
  },
  {
    quote: "Sales are contingent upon the attitude of the salesman, not the attitude of the prospect.",
    author: "W. Clement Stone",
  },
  {
    quote: "Either you run the day or the day runs you.",
    author: "Jim Rohn",
  },
  {
    quote: "The way to get started is to quit talking and begin doing.",
    author: "Walt Disney",
  },
  {
    quote: "Quality performance starts with a positive attitude.",
    author: "Jeffrey Gitomer",
  },
  {
    quote: "It's not about having the right opportunities. It's about handling the opportunities right.",
    author: "Mark Hunter",
  },
  {
    quote: "Motivation will almost always beat mere talent.",
    author: "Norman Ralph Augustine",
  },
  {
    quote: "The key is not to call the decision maker. The key is to have the decision maker call you.",
    author: "Jeffrey Gitomer",
  },
  {
    quote: "In sales, it's not what you say; it's how they perceive what you say.",
    author: "Jeffrey Gitomer",
  },
  {
    quote: "Become the person who would attract the results you seek.",
    author: "Jim Cathcart",
  },
  {
    quote: "Stop selling. Start helping.",
    author: "Zig Ziglar",
  },
  {
    quote: "Nobody counts the number of ads you run; they just remember the impression you make.",
    author: "William Bernbach",
  },
  {
    quote: "If you are not taking care of your customer, your competitor will.",
    author: "Bob Hooey",
  },
  {
    quote: "The sale begins when the customer says yes.",
    author: "Harvey Mackay",
  },
  {
    quote: "Great salespeople are relationship builders who provide value and help their customers win.",
    author: "Jeffrey Gitomer",
  },
  {
    quote: "The most unprofitable item ever manufactured is an excuse.",
    author: "John Mason",
  },
]

// Get a random quote
export const getRandomQuote = () => {
  const randomIndex = Math.floor(Math.random() * salesQuotes.length)
  return salesQuotes[randomIndex]
}

// Get quote of the day (consistent for the same day)
export const getQuoteOfTheDay = () => {
  const today = new Date()
  const dayOfYear = Math.floor(
    (today.getTime() - new Date(today.getFullYear(), 0, 0).getTime()) / (1000 * 60 * 60 * 24)
  )
  const index = dayOfYear % salesQuotes.length
  return salesQuotes[index]
}
