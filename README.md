# task-mover-bot
This is a discord bot that can help you turn a few discord channels in your server into a simple task management system. To explain what this bot does I will explain the use case that I created it for. 
## Use Case Story
My friends and I develop indie video games and we have a discord server to discuss development on our games. Since we were a small team (3 people) and always on discord, we ended up trying to do our task management on discord. We set up a few channels: "art-tasks", "coding-tasks", "design-tasks", etc. And we had one final channel "completed-tasks". Our system was simple, every time we had a new task we'd put it as a message in one of the dedicated channels that described what type of task it was, "coding-tasks" for example. Then, when that task was finished, we'd copy the message, send it in "completed-tasks", then delete the original message. This worked well enough and it's really nice to have everything in the same place, but the process of copying, sending, and deleting message tasks is slightly tedious. So I decided to create this bot to do that simple task. With this bot, instead of needing to manually move the messages from task channels to the completed channel, you can simply react to a message with ✅ and the bot will move it automatically.
## Setup
In order to setup this app you can simply clone the repository and use the Dockerfile. You'll also need to set up a few things on your discord profile.

First clone the repository to your preferred location.

Open a terminal in the directory of the repository and run ```docker build -t task-mover-bot . ```

Now you should have the docker image of the application. Before we build the docker container we'll need to make a .env file that has the key for the bot that you've invited to your discord server with your discord account. Go to https://discord.com/developers/applications and do the following:
- Make a New Application
- Go to the Bot tab on the left
- Invite a bot to your server. You should be able to ensure this worked by seeing them in your server
- Get the private Token of your bot and save it in a safe place. You may need to reset the token if you missed it

Once you have the bot in your server and have its private token, you can make a file in the task-mover-bot directory called "token.env". The only thing your .env file needs is ```BOT_KEY=your_bot_token_here``` You'll want to replace "your_bot_token_here" with your actual bot token. Make sure this bot token stays hidden for security purposes and is not posted anywhere online or accidentally added to git.

Next run ```docker run -d --restart=always --env-file token.env task-mover-bot``` You can change the settings on this, I have these settings because I'm setting this docker image up to be used on a Raspberry Pi that is on 24/7.

Now the docker container should be running from your computer and you should be able to use the discord bot! To check if it's working simply type "!help" in any of your channels. The bot should also be appearing online. For instructions on how to specifically use the bot, refer to the help command.
## Future Work
Please feel free to fork this or use this code however you like. One simple and easy thing I may add in the future is the ability to allow the user to choose which emoji they'd like to use as the reaction emoji for moving tasks. Or even allowing multiple emojis. I also think it would be nice if the interface for this bot was more non-developer friendly. The process of getting channel ids and linking them could be confusing and tedious. There is also no way currently to unlink channels aside from going into the settings.json file and removing them yourself. If a task channel is linked to multiple completed channels, it also doesn't handle that.