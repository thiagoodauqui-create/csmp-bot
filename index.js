require("dotenv").config();

const {
    Client,
    GatewayIntentBits,
    REST,
    Routes,
    SlashCommandBuilder,
    EmbedBuilder
} = require("discord.js");

const axios = require("axios");

const client = new Client({
    intents: [GatewayIntentBits.Guilds]
});

const commands = [
    new SlashCommandBuilder()
        .setName("ligar")
        .setDescription("Liga o servidor Minecraft")
        .setDefaultMemberPermissions(8),

    new SlashCommandBuilder()
        .setName("status")
        .setDescription("Mostra o status do servidor")
]
.map(command => command.toJSON());

const rest = new REST({ version: "10" })
.setToken(process.env.DISCORD_TOKEN);

(async () => {
    try {

        // apaga comandos globais antigos
        await rest.put(
            Routes.applicationCommands(
                process.env.CLIENT_ID
            ),
            { body: [] }
        );

        // cria comandos no servidor
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

client.on("interactionCreate", async interaction => {

    if(!interaction.isChatInputCommand()) return;

    // /ligar
    if(interaction.commandName==="ligar"){

        try{

            const carregando = new EmbedBuilder()
            .setTitle("⚡ CSMP")
            .setDescription("Enviando solicitação para iniciar o servidor...")
            .setThumbnail(client.user.displayAvatarURL())
            .setTimestamp();

            await interaction.reply({
                embeds:[carregando]
            });

            const resposta = await axios.post(
                `https://api.exaroton.com/v1/servers/${process.env.SERVER_ID}/start`,
                {},
                {
                    headers:{
                        Authorization:`Bearer ${process.env.EXAROTON_TOKEN}`
                    }
                }
            );

            console.log(resposta.data);

            const sucesso = new EmbedBuilder()
            .setTitle("✅ Solicitação enviada")
            .setDescription(
                "Use `/status` para acompanhar o servidor."
            )
            .setThumbnail(client.user.displayAvatarURL())
            .setTimestamp();

            await interaction.followUp({
                embeds:[sucesso]
            });

        }catch(err){

            console.log(err.response?.data || err.message);

            const erro = new EmbedBuilder()
            .setTitle("❌ Erro")
            .setDescription("Não foi possível iniciar o servidor.")
            .setTimestamp();

            await interaction.followUp({
                embeds:[erro]
            });

        }
    }

    // /status
    if(interaction.commandName==="status"){

        try{

            const resposta = await axios.get(
                `https://api.exaroton.com/v1/servers/${process.env.SERVER_ID}`,
                {
                    headers:{
                        Authorization:`Bearer ${process.env.EXAROTON_TOKEN}`
                    }
                }
            );

            console.log(resposta.data);

            const estado = resposta.data.data.status;

            const embed = new EmbedBuilder()
            .setTitle("📊 Status do CSMP")
            .setDescription(
                `Servidor: **${estado}**`
            )
            .setThumbnail(client.user.displayAvatarURL())
            .setTimestamp();

            await interaction.reply({
                embeds:[embed]
            });

        }catch(err){

            console.log(err.response?.data || err.message);

            await interaction.reply({
                content:"❌ Erro ao consultar status."
            });

        }

    }

});

client.login(process.env.DISCORD_TOKEN);