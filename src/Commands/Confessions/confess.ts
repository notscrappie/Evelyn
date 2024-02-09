import { EmbedBuilder, ModalBuilder, TextInputStyle, ActionRowBuilder, TextInputBuilder, ChatInputCommandInteraction, ModalSubmitInteraction, WebhookClient } from 'discord.js';
import { Discord, Slash, ModalComponent } from 'discordx';
import { SecureStorage } from '@Helpers/secureStorage';
import { inject, injectable } from 'tsyringe';
import { Guilds } from '@Services';
import { Evelyn } from '@Evelyn';

@Discord()
@injectable()
export class Confess {
	// eslint-disable-next-line no-empty-function
	constructor(
		@inject(Guilds) private readonly guildService: Guilds,
		@inject(SecureStorage) private readonly secureStorage: SecureStorage,
		// eslint-disable-next-line no-empty-function
	) {}

	private async sendConfession(guildId: string, client: Evelyn, embed: EmbedBuilder) {
		const data = await this.guildService.getFeatureData(guildId, 'confessions');

		const decryptedToken = this.secureStorage.decrypt(data?.confessions?.webhook.token, client);

		const confessDropOff = new WebhookClient({
			id: data?.confessions?.webhook?.id,
			token: decryptedToken,
		});

		return confessDropOff.send({
			embeds: [embed],
		});
	}

	@Slash({ name: 'confess', description: 'Send a confession.' })
	async confess(interaction: ChatInputCommandInteraction): Promise<void> {
		const modal = new ModalBuilder()
			.setCustomId('confessionModal')
			.setTitle('Send a confession')
			.setComponents(
				new ActionRowBuilder<TextInputBuilder>().setComponents(
					new TextInputBuilder()
						.setCustomId('confession')
						.setLabel('Confession')
						.setStyle(TextInputStyle.Paragraph)
						.setRequired(true)
						.setMinLength(1),
				),
			);
		await interaction.showModal(modal);
	}

	@ModalComponent()
	async confessionModal(interaction: ModalSubmitInteraction, client: Evelyn) {
		const { fields, guildId } = interaction;
		const data = await this.guildService.getFeatureData(guildId, 'confessions');
		const embed = new EmbedBuilder().setColor('Blurple');
		const confession = fields.getTextInputValue('confession');

		if (!(data?.confessions?.enabled && data?.confessions.webhook.id))
			return interaction.reply({
				embeds: [
					embed.setDescription(
						'🔹 | Confessions are not enabled on this server or a channel for them hasn\'t been set yet.',
					),
				],
				ephemeral: true,
			});

		await interaction.reply({
			embeds: [
				embed.setDescription('🔹 | Your confession will be delivered shortly.'),
			],
			ephemeral: true,
		});

		return await this.sendConfession(guildId, client,
			embed
				.setTitle('Evelyn · Confessions')
				.setDescription(confession)
				.setTimestamp(),
		);
	}
}
