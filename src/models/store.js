const fs = require('fs');
const path = require('path');

const DATA_DIR = path.join(__dirname, '../../data');

// Ensure data directory exists
if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}

const readData = (file) => {
  const filePath = path.join(DATA_DIR, `${file}.json`);
  if (!fs.existsSync(filePath)) return [];
  try {
    return JSON.parse(fs.readFileSync(filePath, 'utf8'));
  } catch { return []; }
};

const writeData = (file, data) => {
  const filePath = path.join(DATA_DIR, `${file}.json`);
  fs.writeFileSync(filePath, JSON.stringify(data, null, 2));
};

// Initialize default data
const initDefaults = () => {
  if (readData('podcasts').length === 0) {
    writeData('podcasts', [
      {
        id: '1',
        title: 'From Warehouse to 250+ Installs: The Story of Jeff Pilla',
        description: 'At just 26 years old, Jeff Pilla\'s journey is a masterclass in grit, sales psychology, and the power of refusing to settle. From warehouse work to becoming a solar industry powerhouse with 250+ installs in a single year.',
        youtubeUrl: 'https://youtu.be/sMpRcau80V4?si=GrtZcWg5xgrQrXuU',
        youtubeId: 'sMpRcau80V4',
        thumbnail: 'https://img.youtube.com/vi/sMpRcau80V4/maxresdefault.jpg',
        guest: 'Jeff Pilla',
        featured: true,
        publishedAt: new Date('2024-01-15').toISOString(),
        createdAt: new Date().toISOString()
      },
      {
        id: '2',
        title: 'The Relentless Podcast: Entrepreneur Talk',
        description: 'Raw conversations on business, growth, and building something that lasts. No fluff. No ego. Just lessons that work from builders who\'ve lived it.',
        youtubeUrl: 'https://youtu.be/sMpRcau80V4?si=GrtZcWg5xgrQrXuU',
        youtubeId: 'sMpRcau80V4',
        thumbnail: 'https://img.youtube.com/vi/sMpRcau80V4/maxresdefault.jpg',
        guest: 'Sam DeMaio',
        featured: false,
        publishedAt: new Date('2024-02-01').toISOString(),
        createdAt: new Date().toISOString()
      }
    ]);
  }

  if (readData('blogs').length === 0) {
    writeData('blogs', [
      {
        id: '1',
        title: 'From Warehouse to 250+ Installs: The Relentless Hustle of Jeff Pilla',
        slug: 'from-warehouse-to-250-installs-jeff-pilla',
        excerpt: 'In our latest episode of the Relentless Podcast, we sat down with entrepreneur Jeff Pilla to pull back the curtain on his rapid rise in the solar industry.',
        content: `<p>In our latest episode of the Relentless Podcast, we sat down with entrepreneur Jeff Pilla to pull back the curtain on his rapid rise in the solar industry. At just 26 years old, Jeff's journey is a masterclass in grit, sales psychology, and the power of refusing to settle.</p>

<h2>The Journey: Building from the Ground Up</h2>
<p>Jeff didn't start at the top. His path began with hard manual labor—warehouse work and residential lawn care. He emphasizes that he didn't take the traditional college route; instead, he chose to become a "hustler."</p>
<p>His breakthrough came when he dove headfirst into the solar industry. Through relentless door-knocking, he transformed himself into a top-tier sales professional, eventually moving from setting appointments to closing his own deals. His production is staggering: he personally managed over 250 installs in a single year.</p>

<h2>Key Takeaways for Aspiring Entrepreneurs</h2>
<p>Throughout the conversation, Jeff shared the mindset that keeps him ahead of the competition:</p>
<ul>
<li><strong>Embrace Rejection as Data:</strong> Jeff notes that door-knocking is a numbers game. He doesn't take 'no' personally; he views it as a necessary step toward the next 'yes.'</li>
<li><strong>Transfer of Energy:</strong> Sales, according to Jeff, is purely a transfer of energy. People buy from people they like and trust.</li>
<li><strong>The "Sponge" Mentality:</strong> Jeff credits much of his success to his willingness to learn from others, even traveling to Utah—the door-knocking capital—to study the best in the business.</li>
<li><strong>Discipline Over Comfort:</strong> Whether it's showing up to appointments in the snow or working through personal adversity, Jeff's philosophy is simple: Life goes on, and the bills have to get paid.</li>
</ul>

<h2>Looking Ahead: Building Wealth</h2>
<p>Now that Jeff has mastered sales, he's turning his attention to real estate and financial freedom. We discussed the importance of diversifying his income, moving from a 1099 contractor mindset into property ownership and flips. By focusing on rental properties, Jeff aims to let his money work for him, rather than just relying on the grind of active sales.</p>

<h2>Final Advice</h2>
<p>When asked what advice he has for 18-year-olds today, Jeff's answer was clear: Go knock on doors. It builds people skills and resilience that you simply cannot get in a classroom. If you're willing to work for yourself, there is no limit to what you can achieve.</p>`,
        image: '/assets/jeff-pilla.jpeg',
        author: 'Sam DeMaio',
        tags: ['entrepreneurship', 'sales', 'solar', 'mindset'],
        publishedAt: new Date('2024-01-20').toISOString(),
        createdAt: new Date().toISOString()
      }
    ]);
  }

  if (readData('users').length === 0) {
    const bcrypt = require('bcryptjs');
    const hashedPassword = bcrypt.hashSync(process.env.ADMIN_PASSWORD || 'Admin@Relentless2024!', 10);
    writeData('users', [{
      id: '1',
      username: 'admin',
      email: process.env.ADMIN_EMAIL || 'admin@relentlesspodcast.com',
      password: hashedPassword,
      role: 'admin',
      createdAt: new Date().toISOString()
    }]);
  }
};

initDefaults();

module.exports = { readData, writeData };
