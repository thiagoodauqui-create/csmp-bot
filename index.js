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

// Link de uma imagem padrão pra aparecer em todos os embeds.
// Troca esse valor quando tiver a arte pronta (ex: "https://i.imgur.com/SEULINK.png")
const IMAGEM_PADRAO = null;

function baseEmbed(titulo, descricao, cor) {
  const embed = new EmbedBuilder()
    .setTitle(titulo)
    .setDescription(descricao)
    .setColor(cor)
    .setThumbnail(client.user.displayAvatarURL())
    .setTimestamp();

  if (IMAGEM_PADRAO) {
    embed.setImage(IMAGEM_PADRAO);
  }

  return embed;
}

const EXAROTON_HEADERS = {
  headers: {
    Authorization: `Bearer ${process.env.EXAROTON_TOKEN}`
  }
};

const STATUS_EMOJI = {
  online: "🟢 Online",
  offline: "🔴 Offline",
  starting: "🟡 Iniciando",
  stopping: "🟠 Desligando",
  restarting: "🔄 Reiniciando",
  saving: "💾 Salvando",
  loading: "⏳ Carregando",
  crashed: "💥 Crashado",
  pending: "⏸ Pendente",
  preparing: "🛠 Preparando"
};

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
    .setName("reiniciar")
    .setDescription("Reinicia o servidor Minecraft")
    .setDefaultMemberPermissions(8),

  new SlashCommandBuilder()
    .setName("status")
    .setDescription("Mostra o status do servidor"),

  new SlashCommandBuilder()
    .setName("jogadores")
    .setDescription("Mostra quem está online no servidor"),

  new SlashCommandBuilder()
    .setName("creditos-exaroton")
    .setDescription("Mostra os créditos restantes na conta do Exaroton")
    .setDefaultMemberPermissions(8),

  new SlashCommandBuilder()
    .setName("anuncio")
    .setDescription("Envia um anúncio para o canal")
    .setDefaultMemberPermissions(8)
    .addStringOption(opcao =>
      opcao
        .setName("mensagem")
        .setDescription("Texto do anúncio")
        .setRequired(true)
    )
].map(command => command.toJSON());

const rest = new REST({ version: "10" }).setToken(process.env.DISCORD_TOKEN);

(async () => {
  try {
    // apaga comandos globais antigos
    await rest.put(Routes.applicationCommands(process.env.CLIENT_ID), {
      body: []
    });

    // cria comandos no servidor
    await rest.put(
      Routes.applicationGuildCommands(process.env.CLIENT_ID, process.env.GUILD_ID),
      { body: commands }
    );

    console.log("Comandos registrados");
  } catch (err) {
    console.log(err);
  }
})();

client.on("interactionCreate", async interaction => {
  if (!interaction.isChatInputCommand()) return;

  // /ligar
  if (interaction.commandName === "ligar") {
    try {
      await interaction.reply({
        embeds: [baseEmbed("⚡ CSMP", "Enviando solicitação para iniciar o servidor...", 0xfee75c)]
      });

      await axios.post(
        `https://api.exaroton.com/v1/servers/${process.env.SERVER_ID}/start`,
        {},
        EXAROTON_HEADERS
      );

      await interaction.followUp({
        embeds: [baseEmbed("✅ Solicitação enviada", "Use `/status` para acompanhar o servidor.", 0x57f287)]
      });
    } catch (err) {
      console.log(err.response?.data || err.message);
      await interaction.followUp({
        embeds: [baseEmbed("❌ Erro", "Não foi possível iniciar o servidor.", 0xed4245)]
      });
    }
  }

  // /desligar
  if (interaction.commandName === "desligar") {
    try {
      await interaction.reply({
        embeds: [baseEmbed("🛑 CSMP", "Enviando solicitação para desligar o servidor...", 0xed4245)]
      });

      await axios.post(
        `https://api.exaroton.com/v1/servers/${process.env.SERVER_ID}/stop`,
        {},
        EXAROTON_HEADERS
      );

      const embedSucesso = baseEmbed(
        "🔴 Servidor desligando",
        "O servidor foi enviado para desligamento com sucesso.",
        0xed4245
      ).addFields(
        { name: "👤 Por", value: interaction.user.tag, inline: true },
        { name: "⏱ Status", value: "Stopping...", inline: true }
      );

      await interaction.followUp({ embeds: [embedSucesso] });
    } catch (err) {
      console.log(err.response?.data || err.message);
      await interaction.followUp({
        embeds: [baseEmbed("❌ Erro ao desligar", "Não foi possível desligar o servidor.", 0xed4245)]
      });
    }
  }

  // /reiniciar
  if (interaction.commandName === "reiniciar") {
    try {
      await interaction.reply({
        embeds: [baseEmbed("🔄 CSMP", "Enviando solicitação para reiniciar o servidor...", 0xf39c12)]
      });

      await axios.post(
        `https://api.exaroton.com/v1/servers/${process.env.SERVER_ID}/restart`,
        {},
        EXAROTON_HEADERS
      );

      await interaction.followUp({
        embeds: [baseEmbed("🔄 Reiniciando", "O servidor vai ficar offline por alguns segundos e voltar sozinho.", 0xf39c12)]
      });
    } catch (err) {
      console.log(err.response?.data || err.message);
      await interaction.followUp({
        embeds: [baseEmbed("❌ Erro ao reiniciar", "Não foi possível reiniciar o servidor.", 0xed4245)]
      });
    }
  }

  // /status
  if (interaction.commandName === "status") {
    try {
      const resposta = await axios.get(
        `https://api.exaroton.com/v1/servers/${process.env.SERVER_ID}`,
        EXAROTON_HEADERS
      );

      const estado = resposta.data.data.status;
      const texto = STATUS_EMOJI[estado] || estado;

      await interaction.reply({
        embeds: [baseEmbed("📊 CSMP Status", `Servidor: **${texto}**`, 0x2b2d31)]
      });
    } catch (err) {
      console.log(err.response?.data || err.message);
      await interaction.reply({
        embeds: [baseEmbed("❌ Erro", "Erro ao consultar status.", 0xed4245)]
      });
    }
  }

  // /jogadores
  if (interaction.commandName === "jogadores") {
    try {
      const resposta = await axios.get(
        `https://api.exaroton.com/v1/servers/${process.env.SERVER_ID}`,
        EXAROTON_HEADERS
      );

      const dados = resposta.data.data;
      const lista = dados.players?.list?.length
        ? dados.players.list.join(", ")
        : "Nenhum jogador online";

      await interaction.reply({
        embeds: [
          baseEmbed(
            "🎮 Jogadores online",
            `${dados.players?.count ?? 0}/${dados.players?.max ?? "?"}\n${lista}`,
            0x2ecc71
          )
        ]
      });
    } catch (err) {
      console.log(err.response?.data || err.message);
      await interaction.reply({
        embeds: [baseEmbed("❌ Erro", "Não foi possível consultar os jogadores online.", 0xed4245)]
      });
    }
  }

  // /creditos-exaroton
  if (interaction.commandName === "creditos-exaroton") {
    try {
      const resposta = await axios.get("https://api.exaroton.com/v1/account", EXAROTON_HEADERS);
      const creditos = resposta.data.data.credits;

      await interaction.reply({
        embeds: [baseEmbed("💳 Créditos Exaroton", `Saldo atual: **${creditos} créditos**`, 0x3498db)]
      });
    } catch (err) {
      console.log(err.response?.data || err.message);
      await interaction.reply({
        embeds: [baseEmbed("❌ Erro", "Não foi possível consultar os créditos.", 0xed4245)]
      });
    }
  }

  // /anuncio
  if (interaction.commandName === "anuncio") {
    const texto = interaction.options.getString("mensagem");

    await interaction.reply({
      embeds: [baseEmbed("📢 Anúncio", texto, 0x9b59b6)]
    });
  }
});

client.login(process.env.DISCORD_TOKEN);