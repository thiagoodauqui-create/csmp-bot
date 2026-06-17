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

client.on("clientReady", () => {
    console.log(`Bot online: ${client.user.tag}`);
});

client.on("interactionCreate", async interaction => {

    if(!interaction.isChatInputCommand()) return;

    if(interaction.commandName==="ligar"){

        const carregando = new EmbedBuilder()
        .setTitle("⚡ CSMP")
        .setDescription("Iniciando o servidor...")
        .setThumbnail(client.user.displayAvatarURL())
        .setFooter({
            text:"CSMP Bot"
        })
        .setTimestamp();

       await interaction.reply({
    embeds:[carregando]
});

        try{

console.log("SERVER_ID:", process.env.SERVER_ID);


            await axios.post(
    `https://api.exaroton.com/v1/servers/${process.env.SERVER_ID}/start/`,
    {},
    {
        headers: {
            Authorization: `Bearer ${process.env.EXAROTON_TOKEN}`
        }
    }
);
            c.setTitle("⏳ Solicitação enviada")
.setDescription(
"A ordem para ligar o servidor foi enviada.\nUse /status para acompanhar."
)
            .setThumbnail(client.user.displayAvatarURL())
            .setFooter({
                text:"CSMP Bot"
            })
            .setTimestamp();

            await interaction.reply({
    embeds:[carregando]
});

        }catch(err){

            console.log(
                err.response?.data || err.message
            );

            const erro = new EmbedBuilder()
            .setTitle("❌ Erro")
            .setDescription(
                "Não foi possível iniciar o servidor."
            );

            await interaction.reply({
    embeds:[carregando]
});
if(interaction.commandName==="status"){

    try{

        const resposta = await axios.get(
            `https://api.exaroton.com/v1/servers/${process.env.SERVER_ID}/`,
            {
                headers:{
                    Authorization:
                    `Bearer ${process.env.EXAROTON_TOKEN}`
                }
            }
        );

        const status = resposta.data.data.status;

        const embed = new EmbedBuilder()
        .setTitle("📊 Status do CSMP")
        .setDescription(
            `Estado atual: **${status}**`
        )
        .setThumbnail(
            client.user.displayAvatarURL()
        )
        .setTimestamp();

        await interaction.reply({
            embeds:[embed]
        });

    }catch(err){

        console.log(
            err.response?.data || err.message
        );

        await interaction.reply({
            content:"❌ Não foi possível verificar o servidor."
        });

    }

}
        }

    }

});

client.login(process.env.DISCORD_TOKEN);