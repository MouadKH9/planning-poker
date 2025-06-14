# 🃏 Planning Poker

A real-time collaborative estimation tool for agile teams built with Django Channels, WebSockets, and React.

[![Django](https://img.shields.io/badge/Django-5.2.3-green.svg)](https://www.djangoproject.com/)
[![React](https://img.shields.io/badge/React-18.x-blue.svg)](https://reactjs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.x-blue.svg)](https://www.typescriptlang.org/)
[![WebSockets](https://img.shields.io/badge/WebSockets-Real--time-orange.svg)](https://developer.mozilla.org/en-US/docs/Web/API/WebSockets_API)
[![License](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)

## 🚀 Features

### 🎯 Core Planning Poker Features
- **Real-time Voting** - Live card selection with instant updates
- **Multiple Card Scales** - Fibonacci, T-shirt sizes, and custom scales
- **Host Controls** - Start rounds, reveal cards, skip participants
- **Voting Statistics** - Average, consensus detection, and result analysis
- **Session History** - Complete logs of all estimation rounds

### 🔧 Technical Features
- **WebSocket Communication** - Real-time updates across all participants
- **Responsive Design** - Works seamlessly on desktop and mobile
- **Guest Mode** - Join sessions without account creation
- **Room Management** - Unique room codes for easy sharing
- **Auto-reconnection** - Handles network interruptions gracefully

### 🎨 User Experience
- **Intuitive Interface** - Clean, modern design with smooth animations
- **Live Participant Status** - See who has voted in real-time
- **Toast Notifications** - Non-intrusive feedback for all actions
- **Drag & Drop Cards** - Smooth card selection experience
- **Room Chat** - Built-in communication during sessions

## 🛠️ Tech Stack

### Backend
- **Django 5.2.3** - Web framework
- **Django Channels 4.2.2** - WebSocket support
- **Django REST Framework 3.16.0** - API development
- **PostgreSQL** - Database
- **Daphne** - ASGI server

### Frontend
- **React 18** - UI library
- **TypeScript** - Type safety
- **Vite** - Build tool
- **TailwindCSS** - Styling
- **Framer Motion** - Animations
- **React Router** - Navigation

### Infrastructure
- **Docker** - Database containerization
- **WebSockets** - Real-time communication
- **ASGI** - Asynchronous server interface

## 📋 Prerequisites

- **Python 3.11+**
- **Node.js 18+**
- **Docker & Docker Compose**
- **PostgreSQL** (via Docker)

## 🚀 Quick Start

### 1. Clone the Repository
```bash
git clone https://github.com/yourusername/planning-poker.git
cd planning-poker
```

### 2. Start the Database
```bash
# Start PostgreSQL in Docker
chmod +x db-setup.sh
./db-setup.sh start
```

### 3. Setup Backend
```bash
cd planning_poker

# Create virtual environment
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate

# Install dependencies
pip install -r requirements.txt

# Setup environment variables
cp .env.example .env  # Configure your settings

# Run migrations
python manage.py migrate

# Create admin user
python manage.py create_dev_admin

# Start Django server
python manage.py runserver
```

### 4. Setup Frontend
```bash
cd frontend

# Install dependencies
npm install

# Start development server
npm run dev
```

### 5. Access the Application
- **Frontend**: http://localhost:5173
- **Backend API**: http://localhost:8000/api/
- **Django Admin**: http://localhost:8000/admin/

## 🐳 Docker Setup

For database-only Docker setup (recommended for development):

```bash
# Start PostgreSQL database
docker-compose up -d db

# Stop database
docker-compose down

# View logs
docker-compose logs -f db
```

## 📁 Project Structure

```
planning-poker/
├── planning_poker/              # Django backend
│   ├── planning_poker/         # Django project
│   │   ├── consumers.py        # WebSocket consumers
│   │   ├── models.py          # Database models
│   │   ├── api_views.py       # REST API views
│   │   ├── serializers.py     # API serializers
│   │   └── routing.py         # WebSocket routing
│   ├── requirements.txt        # Python dependencies
│   ├── manage.py              # Django management
│   └── .env                   # Environment variables
├── frontend/                   # React frontend
│   ├── src/
│   │   ├── Pages/             # React components
│   │   ├── components/        # Reusable components
│   │   ├── lib/              # Utilities & APIs
│   │   └── types/            # TypeScript types
│   ├── package.json          # Node dependencies
│   └── vite.config.ts        # Vite configuration
├── docker-compose.yml          # Database container
├── db-setup.sh                # Database management script
└── README.md                  # This file
```

## 🎮 Usage

### Creating a Room
1. Visit the application homepage
2. Click "Create New Room"
3. Share the generated room code with your team

### Joining a Room
1. Enter the room code on the homepage
2. Click "Join Room"
3. Start participating in the estimation session

### Host Controls
- **Start Round**: Begin a new estimation round
- **Reveal Cards**: Show all participant votes
- **Reset Votes**: Clear all votes for a new round
- **Skip Participant**: Mark inactive participants as skipped

### Voting Process
1. Select a card value from the available options
2. Wait for all participants to vote
3. Host reveals cards to see results
4. View statistics and discuss estimates

## 🔧 API Endpoints

### Rooms
```http
POST   /api/rooms/           # Create new room
GET    /api/rooms/{id}/      # Get room details
POST   /api/rooms/{id}/start/    # Start new round
POST   /api/rooms/{id}/reveal/   # Reveal cards
POST   /api/rooms/{id}/skip/     # Skip participant
GET    /api/rooms/{id}/logs/     # Get session history
```

### WebSocket Events
```javascript
// Incoming events
'room_state'        // Initial room state
'vote_submitted'    // User voted
'cards_revealed'    // Cards revealed
'votes_reset'       // Votes cleared
'user_connected'    // User joined
'user_disconnected' // User left

// Outgoing events
'submit_vote'       // Submit vote
'reveal_cards'      // Reveal all cards
'reset_votes'       // Reset all votes
'start_round'       // Start new round
'chat_message'      // Send chat message
```

## 🧪 Development

### Backend Development
```bash
cd planning_poker

# Run tests
python manage.py test

# Create migrations
python manage.py makemigrations

# Django shell
python manage.py shell

# Check code style
flake8 .
black .
```

### Frontend Development
```bash
cd frontend

# Run tests
npm test

# Build for production
npm run build

# Type checking
npm run type-check

# Linting
npm run lint
```

### Database Management
```bash
# Start database
./db-setup.sh start

# Stop database
./db-setup.sh stop

# View logs
./db-setup.sh logs

# Check status
./db-setup.sh status

# Clean up
./db-setup.sh clean
```

## 🔐 Environment Variables

Create a `.env` file in the `planning_poker` directory:

```env
# Database
POSTGRES_PASSWORD=postgres
POSTGRES_USER=postgres
POSTGRES_DB=planning_poker_db
DB_HOST=localhost
DB_PORT=5437

# Django
SECRET_KEY=your-secret-key-here
DEBUG=True
ALLOWED_HOSTS=localhost,127.0.0.1
```

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

### Development Guidelines
- Follow PEP 8 for Python code
- Use TypeScript for frontend development
- Write tests for new features
- Update documentation as needed
- Use conventional commit messages

## 📝 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

- **Django Channels** for WebSocket support
- **React** and **TypeScript** for the frontend
- **TailwindCSS** for styling
- **Framer Motion** for animations
- **PostgreSQL** for data persistence

## 🐛 Known Issues

- [ ] Guest user persistence across sessions
- [ ] Mobile touch gesture improvements
- [ ] Voice/video integration

## 🗺️ Roadmap

- [ ] **Authentication System** - User accounts and team management
- [ ] **Custom Card Scales** - User-defined estimation scales
- [ ] **Session Templates** - Reusable session configurations
- [ ] **Analytics Dashboard** - Team estimation insights
- [ ] **Slack/Teams Integration** - Notifications and bot commands
- [ ] **Export Features** - PDF/Excel session reports
- [ ] **Mobile App** - Native iOS/Android applications

## 📞 Support

If you encounter any issues or have questions:

1. Check the [Issues](https://github.com/yourusername/planning-poker/issues) page
2. Create a new issue with detailed information
3. Contact the development team

---

<div align="center">
  <p>Built with ❤️ for agile teams</p>
  <p>
    <a href="#top">Back to top</a>
  </p>
</div>