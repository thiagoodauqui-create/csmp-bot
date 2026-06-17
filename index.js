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
        .setName("desligar")
        .setDescription("Desliga o servidor Minecraft")
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

            const carregando = baseEmbed(
    "⚡ CSMP",
    "Enviando solicitação para iniciar o servidor...",
    0xfee75c
);

            await interaction.reply({
                embeds:[carregando]
            });
            
console.log("TOKEN:", !!process.env.EXAROTON_TOKEN);
console.log("SERVER_ID:", process.env.SERVER_ID);
console.log("URL:",
`https://api.exaroton.com/v1/servers/${process.env.SERVER_ID}/start`
);
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
                const statusEmoji = {
    online: "🟢 Online",
    offline: "🔴 Offline",
    starting: "🟡 Iniciando",
    stopping: "🟠 Desligando"
};

const embed = new EmbedBuilder()
    .setTitle("📊 CSMP Status")
    .setDescription(`Servidor: **${statusEmoji[estado] || estado}**`)
    .setColor(0x2b2d31)
    .setThumbnail(client.user.displayAvatarURL())
    .setTimestamp();
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

})
;if (interaction.commandName === "desligar") {
    try {
        const embedCarregando = new EmbedBuilder()
            .setTitle("🛑 CSMP")
            .setDescription("Enviando solicitação para desligar o servidor...")
            .setColor(0xed4245)
            .setThumbnail(client.user.displayAvatarURL())
            .setTimestamp();

        await interaction.reply({ embeds: [embedCarregando] });

        await axios.post(
            `https://api.exaroton.com/v1/servers/${process.env.SERVER_ID}/stop`,
            {},
            {
                headers: {
                    Authorization: `Bearer ${process.env.EXAROTON_TOKEN}`
                }
            }
        );

        const embedSucesso = new EmbedBuilder()
            .setTitle("🔴 Servidor desligando")
            .setDescription("O servidor foi enviado para desligamento com sucesso.")
            .setColor(0xff0000)
            .addFields(
                { name: "👤 Por", value: interaction.user.tag, inline: true },
                { name: "⏱ Status", value: "Stopping...", inline: true }
            )
            .setThumbnail(client.user.displayAvatarURL())
            .setTimestamp();

        await interaction.followUp({ embeds: [embedSucesso] });

    } catch (err) {
        console.log(err.response?.data || err.message);

        const erro = new EmbedBuilder()
            .setTitle("❌ Erro ao desligar")
            .setDescription("Não foi possível desligar o servidor.")
            .setColor(0x2b2d31)
            .setTimestamp();

        await interaction.followUp({ embeds: [erro] });
    }
}

client.login(process.env.DISCORD_TOKEN);