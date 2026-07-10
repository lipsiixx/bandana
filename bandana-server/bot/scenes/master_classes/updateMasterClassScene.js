const { Scenes, Markup } = require("telegraf");
const MasterClasses = require("../../../models/master_classes");

const updateMasterClassScene = new Scenes.WizardScene(
  "update_master_class",

  // Шаг 1 - Выбор мастер-класса (С ВИЗУАЛЬНЫМ СТАТУСОМ)
  async (ctx) => {
    ctx.wizard.state.sentMessages = [];

    const masterClasses = await MasterClasses.findAll({
      order: [["event_date", "DESC"]],
    });

    if (masterClasses.length === 0) {
      await ctx.reply("❌ Нет мастер-классов для редактирования.");
      return ctx.scene.leave();
    }

    const buttons = masterClasses.map((mc) => {
      // 👇 ВИЗУАЛЬНЫЙ СТАТУС
      const statusIcon = mc.is_archived ? "📦" : "✅";
      const statusText = mc.is_archived ? "В архиве" : "Активен";

      return [
        Markup.button.callback(
          `${statusIcon} ${mc.name.substring(0, 30)} [${statusText}]`,
          `edit_${mc.id}`,
        ),
      ];
    });

    await ctx.reply(
      "Выберите мастер-класс для редактирования:\n\n✅ - Активен\n📦 - В архиве",
      Markup.inlineKeyboard(buttons),
    );
    return ctx.wizard.next();
  },

  // Шаг 2 - Выбор поля для редактирования (С ПОКАЗОМ ТЕКУЩЕГО СТАТУСА)
  async (ctx) => {
    if (!ctx.callbackQuery) return;

    const action = ctx.callbackQuery.data;
    await ctx.answerCbQuery();

    if (!action.startsWith("edit_")) return;

    const id = action.replace("edit_", "");
    const masterClass = await MasterClasses.findByPk(id);

    if (!masterClass) {
      await ctx.reply("❌ Мастер-класс не найден.");
      return ctx.scene.leave();
    }

    ctx.wizard.state.masterClassId = id;

    // 👇 ПОКАЗЫВАЕМ ТЕКУЩИЙ СТАТУС
    const currentStatus = masterClass.is_archived
      ? "📦 В архиве"
      : "✅ Активен";
    const archiveButtonText = masterClass.is_archived
      ? "✅ Восстановить из архива"
      : "📦 Отправить в архив";

    const keyboard = Markup.inlineKeyboard([
      [Markup.button.callback("✏ Название", "field_name")],
      [Markup.button.callback("🔗 Ссылку", "field_link")],
      [Markup.button.callback("📅 Дату", "field_date")],
      [Markup.button.callback(archiveButtonText, "field_archive")],
      [Markup.button.callback("❌ Отмена", "cancel")],
    ]);

    await ctx.reply(
      `Редактируем: *${masterClass.name}*\n` +
        `📊 Текущий статус: ${currentStatus}\n\n` +
        `Что хотите изменить?`,
      { parse_mode: "Markdown", ...keyboard },
    );
    return ctx.wizard.next();
  },

  // Шаг 3 - Обработка выбора поля
  async (ctx) => {
    if (!ctx.callbackQuery) return;

    const action = ctx.callbackQuery.data;
    await ctx.answerCbQuery();

    if (action === "cancel") {
      await ctx.reply("❌ Редактирование отменено.");
      return ctx.scene.leave();
    }

    if (action === "field_archive") {
      const mc = await MasterClasses.findByPk(ctx.wizard.state.masterClassId);
      if (mc) {
        const oldStatus = mc.is_archived;
        await mc.update({ is_archived: !mc.is_archived });

        // 👇 ПОДРОБНОЕ СООБЩЕНИЕ О СМЕНЕ СТАТУСА
        if (mc.is_archived) {
          await ctx.reply(
            `📦 Мастер-класс "${mc.name}" перемещён в архив.\n\n` +
              `Теперь он не будет отображаться в списке доступных для отзывов.`,
          );
        } else {
          await ctx.reply(
            `✅ Мастер-класс "${mc.name}" восстановлен из архива.\n\n` +
              `Теперь он снова доступен для выбора.`,
          );
        }
      }
      return ctx.scene.leave();
    }

    // Сохраняем какое поле редактируем
    const field = action.replace("field_", "");
    ctx.wizard.state.editField = field;

    const prompts = {
      name: "✏ Введите новое название:",
      link: "🔗 Введите новую ссылку:",
      date: "📅 Введите новую дату (ГГГГ-ММ-ДД) или /skip для удаления даты:",
    };

    const msg = await ctx.reply(prompts[field]);
    ctx.wizard.state.sentMessages.push(msg.message_id);
    return ctx.wizard.next();
  },

  // Шаг 4 - Получение нового значения
  async (ctx) => {
    const field = ctx.wizard.state.editField;
    const value = ctx.message?.text?.trim();
    const mc = await MasterClasses.findByPk(ctx.wizard.state.masterClassId);

    if (!mc) {
      await ctx.reply("❌ Мастер-класс не найден");
      return ctx.scene.leave();
    }

    try {
      if (field === "name") {
        if (!value || value.length < 2) {
          await ctx.reply("❌ Название должно быть не менее 2 символов");
          return;
        }
        await mc.update({ name: value });
        await ctx.reply("✅ Название обновлено.");
      } else if (field === "link") {
        if (!value) {
          await ctx.reply("❌ Ссылка не может быть пустой");
          return;
        }
        await mc.update({ link: value });
        await ctx.reply("✅ Ссылка обновлена.");
      } else if (field === "date") {
        let date = null;
        if (value && value.toLowerCase() !== "/skip") {
          const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
          if (!dateRegex.test(value)) {
            await ctx.reply("❌ Неверный формат даты. Используйте ГГГГ-ММ-ДД");
            return;
          }
          date = value;
        }
        await mc.update({ event_date: date });
        await ctx.reply(date ? "✅ Дата обновлена." : "✅ Дата удалена.");
      }
    } catch (err) {
      console.error(err);
      await ctx.reply("❌ Ошибка при обновлении.");
    }

    // Очищаем сообщения
    for (const id of ctx.wizard.state.sentMessages) {
      try {
        await ctx.deleteMessage(id);
      } catch (e) {}
    }
    return ctx.scene.leave();
  },
);

module.exports = updateMasterClassScene;
