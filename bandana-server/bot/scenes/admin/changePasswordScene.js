const { Scenes, Markup } = require("telegraf");
const bcrypt = require("bcryptjs");
const AdminUser = require("../../../models/admin_user");
const { logActivity } = require("../../../services/adminAccountService");

const CANCEL_KB = Markup.inlineKeyboard([
  [Markup.button.callback("⛔ Отмена", "pw_cancel")],
]);

const MIN_PASSWORD_LENGTH = 10;

const changePasswordScene = new Scenes.WizardScene(
  "change_admin_password",

  // 0 — выбор аккаунта веб-админки
  async (ctx) => {
    ctx.wizard.state.sentMessages = [];

    const users = await AdminUser.findAll({ order: [["name", "ASC"]] });
    if (!users.length) {
      await ctx.reply("В веб-админке пока нет именных аккаунтов.");
      return ctx.scene.leave();
    }

    ctx.wizard.state.users = users;
    const buttons = users.map((u) => [
      Markup.button.callback(`${u.name} (${u.email})`, `pw_pick_${u.id}`),
    ]);
    buttons.push([Markup.button.callback("⛔ Отмена", "pw_cancel")]);

    const msg = await ctx.reply(
      "🔑 Кому из аккаунтов веб-админки сменить пароль?",
      Markup.inlineKeyboard(buttons),
    );
    ctx.wizard.state.sentMessages.push(msg.message_id);
    return ctx.wizard.next();
  },

  // 1 — новый пароль и подтверждение
  async (ctx) => {
    if (ctx.callbackQuery) {
      const data = ctx.callbackQuery.data;
      try {
        await ctx.answerCbQuery();
      } catch {}

      if (data === "pw_cancel") {
        await clearMessages(ctx);
        await ctx.reply("Отменено.");
        return ctx.scene.leave();
      }

      const match = /^pw_pick_(.+)$/.exec(data);
      if (match) {
        const user = ctx.wizard.state.users.find((u) => u.id === match[1]);
        if (!user) {
          await ctx.reply("Аккаунт не найден, попробуй ещё раз.");
          return ctx.scene.leave();
        }
        ctx.wizard.state.targetUser = user;
        await clearMessages(ctx);
        const msg = await ctx.reply(
          `✏️ Новый пароль для «${user.name}» (${user.email}).\n\n` +
            `Не короче ${MIN_PASSWORD_LENGTH} символов:`,
          CANCEL_KB,
        );
        ctx.wizard.state.sentMessages.push(msg.message_id);
      }
      return;
    }

    if (!ctx.message?.text) return;

    const text = ctx.message.text.trim();
    try {
      await ctx.deleteMessage(ctx.message.message_id);
    } catch {}

    if (!ctx.wizard.state.targetUser) {
      await ctx.reply("Сначала выбери аккаунт — начни заново командой /password.");
      return ctx.scene.leave();
    }

    if (!ctx.wizard.state.pendingPassword) {
      if (text.length < MIN_PASSWORD_LENGTH) {
        await clearMessages(ctx);
        const msg = await ctx.reply(
          `❌ Слишком короткий пароль — нужно не меньше ${MIN_PASSWORD_LENGTH} символов. Попробуй ещё раз:`,
          CANCEL_KB,
        );
        ctx.wizard.state.sentMessages.push(msg.message_id);
        return;
      }
      ctx.wizard.state.pendingPassword = text;
      await clearMessages(ctx);
      const msg = await ctx.reply("🔁 Повтори пароль для подтверждения:", CANCEL_KB);
      ctx.wizard.state.sentMessages.push(msg.message_id);
      return;
    }

    if (text !== ctx.wizard.state.pendingPassword) {
      ctx.wizard.state.pendingPassword = null;
      await clearMessages(ctx);
      const msg = await ctx.reply(
        `❌ Пароли не совпадают. Введи новый пароль заново (не короче ${MIN_PASSWORD_LENGTH} символов):`,
        CANCEL_KB,
      );
      ctx.wizard.state.sentMessages.push(msg.message_id);
      return;
    }

    const user = ctx.wizard.state.targetUser;
    const passwordHash = await bcrypt.hash(text, 10);
    await user.update({ password_hash: passwordHash });

    await logActivity({
      admin: { sub: null, name: `бот: ${ctx.from?.first_name || ctx.from?.username || "админ"}` },
      action: "account.password_reset",
      section: "access",
      summary: `Пароль для «${user.name}» (${user.email}) изменён через Telegram-бота`,
    });

    await clearMessages(ctx);
    await ctx.reply(`✅ Пароль для «${user.name}» (${user.email}) обновлён.`);
    return ctx.scene.leave();
  },
);

async function clearMessages(ctx) {
  for (const id of ctx.wizard.state.sentMessages || []) {
    try {
      await ctx.deleteMessage(id);
    } catch {}
  }
  ctx.wizard.state.sentMessages = [];
}

module.exports = changePasswordScene;
