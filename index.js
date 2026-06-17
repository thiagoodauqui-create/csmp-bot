require("dotenv").config();

const {
    Client,
    GatewayIntentBits,
    REST,
    Routes,
    SlashCommandBuilder
} = require("discord.js");

const axios = require("axios");

const client = new Client({
    intents: [GatewayIntentBits.Guilds]
});

const commands = [
    new SlashCommandBuilder()
        .setName("ligar")
        .setDescription("Liga o servidor Minecraft")
]
.map(command => command.toJSON());

const rest = new REST({version:"10"})
.setToken(process.env.DISCORD_TOKEN);

(async () => {
    try {

        await rest.put(
    Routes.applicationGuildCommands(
        process.env.CLIENT_ID,
        process.env.GUILD_ID
    ),
    { body: commands }
);

        console.log("Comandos registrados");

    } catch(err){
        console.log(err);
    }
})();

client.on("clientReady", () => {
    console.log(`Bot online: ${client.user.tag}`);
});

client.on("interactionCreate", async interaction => {

    if(!interaction.isChatInputCommand()) return;

    if(interaction.commandName==="ligar"){

        await interaction.reply(
            "Iniciando o servidor... aguarde..."
        );

        try{

            await axios.post(
                `https://api.exaroton.com/v1/servers/${process.env.SERVER_ID}/start`,
                {},
                {
                    headers:{
                        Authorization:
                        `Bearer ${process.env.EXAROTON_TOKEN}`
                    }
                }
            );

            await interaction.followUp(
                "Servidor iniciando com sucesso. Boas Aventuras!!"
            );

        }catch(err){

            await interaction.followUp(
                "Erro ao iniciar servidor. Contate os Administradores."
            );

            console.log(err);
        }

    }

});

client.login(process.env.DISCORD_TOKEN);