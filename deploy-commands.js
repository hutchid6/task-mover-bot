const { REST, Routes, SlashCommandBuilder, ChannelType } = require('discord.js');
require('dotenv').config({ path: 'token.env' });

const commands = [
    new SlashCommandBuilder()
        .setName('help')
        .setDescription('Get help with using the bot'),

    new SlashCommandBuilder()
        .setName('channel-list')
        .setDescription('List all channels in the server and their IDs'),

    new SlashCommandBuilder()
        .setName('set-completed-channel')
        .setDescription('Link the current channel to a destination channel for completed tasks')
        .addChannelOption(option =>
            option.setName('channel')
                .setDescription('The destination channel for completed tasks')
                .addChannelTypes(ChannelType.GuildText)
                .setRequired(true)
        ),

    new SlashCommandBuilder()
        .setName('remove-completed-channel')
        .setDescription('Remove the link between the current channel and a destination channel')
        .addChannelOption(option =>
            option.setName('channel')
                .setDescription('The destination channel to disconnect')
                .addChannelTypes(ChannelType.GuildText)
                .setRequired(true)
        ),

    new SlashCommandBuilder()
        .setName('channel-connections-list')
        .setDescription('List all channel connections configured in the server'),

].map(cmd => cmd.toJSON());

const rest = new REST().setToken(process.env.BOT_KEY);

(async () => {
    try {
        console.log('Registering slash commands...');
        await rest.put(
            Routes.applicationCommands(process.env.CLIENT_ID),
            { body: commands }
        );
        console.log('Slash commands registered successfully.');
    } catch (error) {
        console.error(error);
    }
})();
