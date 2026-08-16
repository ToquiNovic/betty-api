import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Resend } from 'resend';

@Injectable()
export class EmailService {
  private readonly logger = new Logger(EmailService.name);
  private resend: Resend | null = null;
  private fromEmail: string;

  constructor(private readonly configService: ConfigService) {
    const apiKey = this.configService.get<string>('resend.apiKey');
    this.fromEmail = this.configService.get<string>('resend.from', 'Betty PaaS <onboarding@resend.dev>');

    if (apiKey && apiKey !== 're_your_resend_api_key_here') {
      this.resend = new Resend(apiKey);
    } else {
      this.logger.warn('Resend API key not configured. Emails will be logged to console in mock mode.');
    }
  }

  async sendPasswordResetEmail(to: string, userName: string, resetToken: string): Promise<boolean> {
    const frontendUrl = this.configService.get<string>('app.frontendUrl', 'http://localhost:5173');
    const resetLink = `${frontendUrl}/reset-password?token=${resetToken}`;

    const htmlContent = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e0e0e0; border-radius: 8px;">
        <h2 style="color: #4338ca;">Betty PaaS - Restablecimiento de Contraseña</h2>
        <p>Hola <strong>${userName}</strong>,</p>
        <p>Has solicitado restablecer tu contraseña en la plataforma universitaria Betty IoT.</p>
        <p>Haz clic en el siguiente botón para crear una nueva contraseña. Este enlace expira en 1 hora:</p>
        <div style="text-align: center; margin: 30px 0;">
          <a href="${resetLink}" style="background-color: #4f46e5; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: bold; display: inline-block;">Restablecer Contraseña</a>
        </div>
        <p style="color: #6b7280; font-size: 14px;">Si no solicitaste este cambio, puedes ignorar este correo de forma segura.</p>
        <hr style="border: 0; border-top: 1px solid #eee; margin: 20px 0;" />
        <p style="color: #9ca3af; font-size: 12px; text-align: center;">Betty IoT PaaS - Plataforma Universitaria de Gemelos Digitales e IoT</p>
      </div>
    `;

    if (!this.resend) {
      this.logger.log(`[MOCK EMAIL] Password reset email to ${to}: ${resetLink}`);
      return true;
    }

    try {
      await this.resend.emails.send({
        from: this.fromEmail,
        to,
        subject: 'Betty PaaS - Restablece tu contraseña',
        html: htmlContent,
      });
      this.logger.log(`Password reset email sent to ${to}`);
      return true;
    } catch (error) {
      this.logger.error(`Failed to send password reset email to ${to}: ${error.message}`);
      return false;
    }
  }

  async sendTeamInvitationEmail(
    to: string,
    teamName: string,
    inviterName: string,
    inviteToken: string,
  ): Promise<boolean> {
    const frontendUrl = this.configService.get<string>('app.frontendUrl', 'http://localhost:5173');
    const inviteLink = `${frontendUrl}/teams/join?token=${inviteToken}`;

    const htmlContent = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e0e0e0; border-radius: 8px;">
        <h2 style="color: #4338ca;">Invitación a Equipo en Betty PaaS</h2>
        <p>Hola,</p>
        <p><strong>${inviterName}</strong> te ha invitado a unirte al equipo <strong>${teamName}</strong> en Betty IoT PaaS.</p>
        <p>Al unirte, podrás compartir y visualizar sensores IoT en tableros colaborativos.</p>
        <div style="text-align: center; margin: 30px 0;">
          <a href="${inviteLink}" style="background-color: #059669; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: bold; display: inline-block;">Aceptar Invitación</a>
        </div>
        <p style="color: #6b7280; font-size: 14px;">Este enlace es válido durante 7 días.</p>
        <hr style="border: 0; border-top: 1px solid #eee; margin: 20px 0;" />
        <p style="color: #9ca3af; font-size: 12px; text-align: center;">Betty IoT PaaS - Plataforma Universitaria</p>
      </div>
    `;

    if (!this.resend) {
      this.logger.log(`[MOCK EMAIL] Team invitation to ${to}: ${inviteLink}`);
      return true;
    }

    try {
      await this.resend.emails.send({
        from: this.fromEmail,
        to,
        subject: `Invitación al equipo ${teamName} en Betty PaaS`,
        html: htmlContent,
      });
      return true;
    } catch (error) {
      this.logger.error(`Failed to send team invitation email to ${to}: ${error.message}`);
      return false;
    }
  }
}
