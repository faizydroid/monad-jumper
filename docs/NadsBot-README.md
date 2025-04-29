# NadsBot Feature Documentation

## Overview

NadsBot is an AI-powered game assistant for JumpNads that provides personalized feedback and tips after each game session. It analyzes your gameplay metrics to give you a funny comment and useful advice to help you improve.

![NadsBot Screenshot](../public/images/nadsbot-screenshot.png)

## Features

- **Post-Game Analysis**: After each game, NadsBot analyzes your performance metrics
- **Personalized Feedback**: Receive customized comments based on your play style
- **Gameplay Tips**: Get practical advice to improve your skills
- **Advanced Analytics**: Behind the scenes, NadsBot tracks detailed gameplay data

## How It Works

NadsBot collects various metrics during your gameplay:

- Score and jump count
- Death reason (fall or monster collision)
- Platform types you've jumped on
- Shots fired and enemies killed
- Session duration

After each game, NadsBot processes this data to provide two key pieces of feedback:

1. **Funny Comment**: A humorous observation about your gameplay style or performance
2. **Practical Advice**: A helpful tip tailored to how you played

## Developer Information

### Integration

NadsBot is implemented as a React component that integrates with the game's post-game flow. The main components:

- `src/components/NadsBot.jsx`: The main component
- `src/components/NadsBot.css`: Styling for the component
- `public/nadsbot-tracking.js`: Game tracking script
- `sql/game_sessions.sql`: Database schema for storing gameplay data

### Data Flow

1. Game events are tracked during gameplay
2. When a game ends, the data is sent to the parent window
3. The NadsBot component receives this data and processes it
4. Gameplay data is stored in Supabase for analytics
5. NadsBot displays personalized feedback to the player

### Future Enhancements

NadsBot is designed to be upgraded to use a Model Context Protocol (MCP) server for more sophisticated AI responses. The documentation in `docs/nadsbot-mcp-integration.md` provides details on how to implement this upgrade.

## Privacy Notice

NadsBot collects gameplay data to provide personalized feedback. This data is:

- Associated with your wallet address
- Stored securely in our database
- Used only for game improvement and analytics
- Never shared with third parties

You can view your stored gameplay data by requesting an export through the admin panel.

## Feedback

We're constantly improving NadsBot! If you have suggestions for improvements or encounter any issues, please let us know through our Discord community or by opening an issue on our GitHub repository. 