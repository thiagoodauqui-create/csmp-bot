require("dotenv").config();

const {
  Client,
  GatewayIntentBits,
  REST,
  Routes,
  SlashCommandBuilder,
  EmbedBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  ComponentType,
  AttachmentBuilder
} = require("discord.js");

const axios = require("axios");

const client = new Client({
  intents: [GatewayIntentBits.Guilds]
});

// Cole as URLs (raw.githubusercontent.com/.../assets/...) depois de subir os PNGs no GitHub.
const MASCOTES = {
  sucesso: "https://raw.githubusercontent.com/thiagoodauqui-create/csmp-bot/main/assets/mascote_1_confirmar.png",

  erro: "https://raw.githubusercontent.com/thiagoodauqui-create/csmp-bot/main/assets/mascote_2_negar.png",

  carregando: "https://raw.githubusercontent.com/thiagoodauqui-create/csmp-bot/main/assets/mascote_3_esperando.png",

  anuncio: "https://raw.githubusercontent.com/thiagoodauqui-create/csmp-bot/main/assets/mascote_4_escrevendo.png",

  info: "https://raw.githubusercontent.com/thiagoodauqui-create/csmp-bot/main/assets/mascote_5_aguardando.png",

aviso: "https://raw.githubusercontent.com/thiagoodauqui-create/csmp-bot/main/assets/mascote_5_aguardando.png",

  economia: "https://raw.githubusercontent.com/thiagoodauqui-create/csmp-bot/main/assets/mascote_6_dinheiro.png"
};

function baseEmbed(tipo, titulo, descricao, cor) {
  const embed = new EmbedBuilder()
    .setTitle(titulo)
    .setDescription(descricao)
    .setColor(cor)
    .setTimestamp();

  const imagem = MASCOTES[tipo];

  if (imagem) {
    embed.setThumbnail(imagem);
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

// Caminho onde o EconomyCraft guarda os saldos. Confirma no Files da Exaroton se mudar.
const CAMINHO_BALANCES = "config/economycraft/data/balances.json";

async function lerArquivoJSON(caminho) {
  const resposta = await axios.get(
    `https://api.exaroton.com/v1/servers/${process.env.SERVER_ID}/files/data`,
    {
      params: { path: caminho },
      headers: { Authorization: `Bearer ${process.env.EXAROTON_TOKEN}` }
    }
  );
  return typeof resposta.data === "string" ? JSON.parse(resposta.data) : resposta.data;
}

// Modelo gratuito da Gemini. Confirma o id exato em ai.google.dev se der erro de "model not found".
const MODELO_GEMINI = "gemini-2.5-flash-lite";

async function analisarLogComGemini(trechoLog) {
  const resposta = await axios.post(
    `https://generativelanguage.googleapis.com/v1beta/models/${MODELO_GEMINI}:generateContent?key=${process.env.GEMINI_API_KEY}`,
    {
      contents: [
        {
          parts: [
            {
              text:
                "Analise este trecho de log de um servidor Minecraft (NeoForge) que crashou. " +
                "Em português, no máximo 4 frases, diga qual mod ou causa provavelmente gerou o crash:\n\n" +
                trechoLog
            }
          ]
        }
      ]
    }
  );

  return (
    resposta.data?.candidates?.[0]?.content?.parts?.[0]?.text ||
    "A IA não retornou um diagnóstico."
  );
}

// ---------- Comandos ----------

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
      opcao.setName("mensagem").setDescription("Texto do anúncio").setRequired(true)
    ),

  new SlashCommandBuilder()
    .setName("saldo")
    .setDescription("Mostra o saldo de um jogador")
    .addStringOption(opcao =>
      opcao.setName("jogador").setDescription("Nome do jogador no Minecraft").setRequired(true)
    ),

  new SlashCommandBuilder()
    .setName("baltop")
    .setDescription("Mostra os 10 maiores saldos do servidor")
].map(command => command.toJSON());

const rest = new REST({ version: "10" }).setToken(process.env.DISCORD_TOKEN);

(async () => {
  try {
    await rest.put(Routes.applicationCommands(process.env.CLIENT_ID), { body: [] });
    await rest.put(
      Routes.applicationGuildCommands(process.env.CLIENT_ID, process.env.GUILD_ID),
      { body: commands }
    );
    console.log("Comandos registrados");
  } catch (err) {
    console.log(err);
  }
})();

// ---------- Estado em memória ----------

let ultimoStatusConhecido = null;

// ---------- Ações com confirmação (desligar / reiniciar) ----------

async function pedirConfirmacao(interaction, { titulo, descricao, aoConfirmar }) {
  const linha = new ActionRowBuilder().addComponents(
    new ButtonBuilder().setCustomId("confirmar").setLabel("Confirmar").setStyle(ButtonStyle.Danger),
    new ButtonBuilder().setCustomId("cancelar").setLabel("Cancelar").setStyle(ButtonStyle.Secondary)
  );

  await interaction.reply({
    embeds: [baseEmbed("aviso", `⚠️ ${titulo}`, descricao, 0xf39c12)],
    components: [linha]
  });

  const respostaMsg = await interaction.fetchReply();

  const coletor = respostaMsg.createMessageComponentCollector({
    componentType: ComponentType.Button,
    time: 30000,
    max: 1,
    filter: i => i.user.id === interaction.user.id
  });

  coletor.on("collect", async i => {
    if (i.customId === "cancelar") {
      await i.update({
        embeds: [baseEmbed("erro", "Cancelado", "Ação cancelada.", 0x99aab5)],
        components: []
      });
      return;
    }
    await aoConfirmar(i);
  });

  coletor.on("end", collected => {
    if (collected.size === 0) {
      interaction
        .editReply({
          embeds: [baseEmbed("erro", "Tempo esgotado", "Confirmação expirou, nada foi feito.", 0x99aab5)],
          components: []
        })
        .catch(() => {});
    }
  });
}

// ---------- Interações ----------

client.on("interactionCreate", async interaction => {
  if (!interaction.isChatInputCommand()) return;

  // /ligar
  if (interaction.commandName === "ligar") {
    try {
      await interaction.reply({
        embeds: [baseEmbed("carregando", "⚡ CSMP", "Enviando solicitação para iniciar o servidor...", 0xfee75c)]
      });

      await axios.post(
        `https://api.exaroton.com/v1/servers/${process.env.SERVER_ID}/start`,
        {},
        EXAROTON_HEADERS
      );

      await interaction.followUp({
        embeds: [baseEmbed("sucesso", "✅ Solicitação enviada", "Use `/status` para acompanhar o servidor.", 0x57f287)]
      });
    } catch (err) {
      console.log(err.response?.data || err.message);
      await interaction.followUp({
        embeds: [baseEmbed("erro", "❌ Erro", "Não foi possível iniciar o servidor.", 0xed4245)]
      });
    }
  }

  // /desligar (com confirmação)
  if (interaction.commandName === "desligar") {
    await pedirConfirmacao(interaction, {
      titulo: "Confirmar desligamento",
      descricao: "Tem certeza que quer desligar o servidor? Jogadores online serão desconectados.",
      aoConfirmar: async i => {
        try {
          await i.update({
            embeds: [baseEmbed("carregando", "🛑 CSMP", "Enviando solicitação para desligar o servidor...", 0xed4245)],
            components: []
          });

          await axios.post(
            `https://api.exaroton.com/v1/servers/${process.env.SERVER_ID}/stop`,
            {},
            EXAROTON_HEADERS
          );

          const embedSucesso = baseEmbed(
            "sucesso",
            "🔴 Servidor desligando",
            "O servidor foi enviado para desligamento com sucesso.",
            0x57f287
          ).addFields(
            { name: "👤 Por", value: interaction.user.tag, inline: true },
            { name: "⏱ Status", value: "Stopping...", inline: true }
          );

          await i.editReply({ embeds: [embedSucesso], components: [] });
        } catch (err) {
          console.log(err.response?.data || err.message);
          await i.editReply({
            embeds: [baseEmbed("erro", "❌ Erro ao desligar", "Não foi possível desligar o servidor.", 0xed4245)],
            components: []
          });
        }
      }
    });
  }

  // /reiniciar (com confirmação)
  if (interaction.commandName === "reiniciar") {
    await pedirConfirmacao(interaction, {
      titulo: "Confirmar reinício",
      descricao: "Tem certeza que quer reiniciar o servidor? Jogadores online serão desconectados por alguns segundos.",
      aoConfirmar: async i => {
        try {
          await i.update({
            embeds: [baseEmbed("carregando", "🔄 CSMP", "Enviando solicitação para reiniciar o servidor...", 0xf39c12)],
            components: []
          });

          await axios.post(
            `https://api.exaroton.com/v1/servers/${process.env.SERVER_ID}/restart`,
            {},
            EXAROTON_HEADERS
          );

          await i.editReply({
            embeds: [baseEmbed("sucesso", "🔄 Reiniciando", "O servidor vai ficar offline por alguns segundos e voltar sozinho.", 0x57f287)],
            components: []
          });
        } catch (err) {
          console.log(err.response?.data || err.message);
          await i.editReply({
            embeds: [baseEmbed("erro", "❌ Erro ao reiniciar", "Não foi possível reiniciar o servidor.", 0xed4245)],
            components: []
          });
        }
      }
    });
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
        embeds: [baseEmbed("info", "📊 CSMP Status", `Servidor: **${texto}**`, 0x2b2d31)]
      });
    } catch (err) {
      console.log(err.response?.data || err.message);
      await interaction.reply({
        embeds: [baseEmbed("erro", "❌ Erro", "Erro ao consultar status.", 0xed4245)]
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
            "info",
            "🎮 Jogadores online",
            `${dados.players?.count ?? 0}/${dados.players?.max ?? "?"}\n${lista}`,
            0x2ecc71
          )
        ]
      });
    } catch (err) {
      console.log(err.response?.data || err.message);
      await interaction.reply({
        embeds: [baseEmbed("erro", "❌ Erro", "Não foi possível consultar os jogadores online.", 0xed4245)]
      });
    }
  }

  // /creditos-exaroton
  if (interaction.commandName === "creditos-exaroton") {
    try {
      const resposta = await axios.get("https://api.exaroton.com/v1/account", EXAROTON_HEADERS);
      const creditos = resposta.data.data.credits;

      await interaction.reply({
        embeds: [baseEmbed("economia", "💳 Créditos Exaroton", `Saldo atual: **${creditos} créditos**`, 0x3498db)]
      });
    } catch (err) {
      console.log(err.response?.data || err.message);
      await interaction.reply({
        embeds: [baseEmbed("erro", "❌ Erro", "Não foi possível consultar os créditos.", 0xed4245)]
      });
    }
  }

  // /anuncio
  if (interaction.commandName === "anuncio") {
    const texto = interaction.options.getString("mensagem");

    await interaction.reply({
      embeds: [baseEmbed("info", "📢 Anúncio", texto, 0x9b59b6)]
    });
  }

  // /saldo
  if (interaction.commandName === "saldo") {
    try {
      const jogador = interaction.options.getString("jogador");
      const balances = await lerArquivoJSON(CAMINHO_BALANCES);
      const valor = balances[jogador];

      if (valor === undefined) {
        await interaction.reply({
          embeds: [
            baseEmbed(
              "erro",
              "❌ Jogador não encontrado",
              `Não encontrei saldo pra **${jogador}**. Confere se o nome está exatamente como no Minecraft.`,
              0xed4245
            )
          ]
        });
        return;
      }

      await interaction.reply({
        embeds: [baseEmbed("economia", "💰 Saldo", `**${jogador}**: ${valor} moedas`, 0x2ecc71)]
      });
    } catch (err) {
      console.log(err.response?.data || err.message);
      await interaction.reply({
        embeds: [baseEmbed("erro", "❌ Erro", "Não consegui ler o arquivo de saldos.", 0xed4245)]
      });
    }
  }

  // /baltop
  if (interaction.commandName === "baltop") {
  try {

    const balances = await lerArquivoJSON(
      CAMINHO_BALANCES
    );

    const ranking = Object.entries(balances)
      .sort((a,b)=>b[1]-a[1])
      .slice(0,10);

    const campeao = ranking[0];

    const lista = ranking
      .map(
        ([nome,valor],i)=>
        `**${i+1}.** ${nome} — ${valor} moedas`
      )
      .join("\n");

    const embed = baseEmbed(
      "economia",
      "🏆 Baltop",
      lista,
      0x2ecc71
    );

    if(campeao){

      embed.setThumbnail(
        `https://mc-heads.net/body/${campeao[0]}`
      );

      embed.addFields({
        name:"👑 Mais rico",
        value:campeao[0],
        inline:true
      });

    }

    await interaction.reply({
      embeds:[embed]
    });

  } catch(err){

    console.log(
      err.response?.data || err.message
    );

    await interaction.reply({
      embeds:[
        baseEmbed(
          "erro",
          "❌ Erro",
          "Não consegui ler ranking",
          0xed4245
        )
      ]
    });

  }
});

// <-- ESTE estava faltando

// ---------- Monitoramento mínimo: só detecta crash ----------
// Sem painel, sem marcos automáticos, sem ranking semanal — só checa status
// periodicamente pra saber quando o servidor cai, e manda alerta + diagnóstico da Gemini.

const INTERVALO_MONITORAMENTO = 2 * 60 * 1000;

client.once("ready", () => {
  console.log(`Bot online como ${client.user.tag}`);

  setInterval(async () => {
    if (!process.env.STATUS_CHANNEL_ID) return;

    try {
      const respostaServidor = await axios.get(
        `https://api.exaroton.com/v1/servers/${process.env.SERVER_ID}`,
        EXAROTON_HEADERS
      );
      const estadoAtual = respostaServidor.data.data.status;

      if (estadoAtual === "crashed" && ultimoStatusConhecido !== "crashed") {
        const canal = await client.channels.fetch(process.env.STATUS_CHANNEL_ID);

        let diagnostico = "Não foi possível gerar diagnóstico automático.";
        let logCompleto = null;

        try {
          const respostaLog = await axios.get(
            `https://api.exaroton.com/v1/servers/${process.env.SERVER_ID}/logs`,
            EXAROTON_HEADERS
          );
          logCompleto = respostaLog.data?.data?.content || null;

          if (logCompleto) {
            diagnostico = await analisarLogComGemini(logCompleto.slice(-6000));
          }
        } catch (errLog) {
          console.log("Erro ao buscar/analisar log:", errLog.response?.data || errLog.message);
        }

        const arquivos = [];
        if (logCompleto) {
          arquivos.push(new AttachmentBuilder(Buffer.from(logCompleto, "utf-8"), { name: "crash-log.txt" }));
        }

        await canal.send({
          embeds: [baseEmbed("erro", "💥 Servidor crashou", diagnostico, 0xed4245)],
          files: arquivos
        });
      }

      ultimoStatusConhecido = estadoAtual;
    } catch (err) {
      console.log("Erro no monitoramento:", err.response?.data || err.message);
    }
  }, INTERVALO_MONITORAMENTO);
});

client.login(process.env.DISCORD_TOKEN);