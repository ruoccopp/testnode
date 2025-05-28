import nodemailer from 'nodemailer';

// Configurazione del trasporter Gmail
const transporter = nodemailer.createTransport({
  host: 'smtp.gmail.com',
  port: 587,
  secure: false,
  auth: {
    user: process.env.GMAIL_USER,
    pass: process.env.GMAIL_APP_PASSWORD,
  },
  tls: {
    rejectUnauthorized: false
  }
});

export interface EmailOptions {
  to: string;
  subject: string;
  html: string;
  attachments?: Array<{
    filename: string;
    content: Buffer;
    contentType: string;
  }>;
}

export async function sendEmail(options: EmailOptions): Promise<boolean> {
  try {
    console.log('🔄 Tentativo invio email a:', options.to);
    
    if (!process.env.GMAIL_USER || !process.env.GMAIL_APP_PASSWORD) {
      console.error('❌ Credenziali Gmail non configurate');
      return false;
    }

    console.log('✅ Credenziali Gmail trovate - User:', process.env.GMAIL_USER);

    const mailOptions = {
      from: process.env.GMAIL_USER,
      to: options.to,
      subject: options.subject,
      html: options.html,
      attachments: options.attachments || [],
    };

    console.log('📧 Invio email in corso...');
    const result = await transporter.sendMail(mailOptions);
    console.log('✅ Email inviata con successo! MessageId:', result.messageId);
    return true;
  } catch (error) {
    console.error('❌ Errore dettagliato invio email:', error);
    if (error.code) console.error('Codice errore:', error.code);
    if (error.response) console.error('Risposta server:', error.response);
    return false;
  }
}

export function generateReportEmailHTML(data: any): string {
  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <style>
        body { font-family: Arial, sans-serif; margin: 0; padding: 20px; background-color: #f5f5f5; }
        .container { max-width: 600px; margin: 0 auto; background: white; border-radius: 8px; overflow: hidden; box-shadow: 0 2px 10px rgba(0,0,0,0.1); }
        .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; text-align: center; }
        .content { padding: 30px; }
        .section { margin-bottom: 25px; }
        .section h3 { color: #333; border-bottom: 2px solid #e0e0e0; padding-bottom: 10px; }
        .data-row { display: flex; justify-content: space-between; padding: 8px 0; border-bottom: 1px solid #f0f0f0; }
        .highlight { background: #f8f9ff; padding: 15px; border-radius: 5px; border-left: 4px solid #667eea; }
        .footer { background: #f8f9fa; padding: 20px; text-align: center; color: #666; font-size: 12px; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>💰 Report Imposte Forfettari</h1>
          <p>Pianificazione fiscale completa per il ${new Date().getFullYear()}</p>
        </div>
        
        <div class="content">
          <div class="section">
            <h3>📊 Riepilogo Calcoli</h3>
            <div class="data-row">
              <span>Reddito Imponibile:</span>
              <strong>€${data.taxableIncome?.toLocaleString('it-IT') || '0'}</strong>
            </div>
            <div class="data-row">
              <span>Imposta Sostitutiva:</span>
              <strong>€${data.taxAmount?.toLocaleString('it-IT') || '0'}</strong>
            </div>
            <div class="data-row">
              <span>Contributi INPS:</span>
              <strong>€${data.inpsAmount?.toLocaleString('it-IT') || '0'}</strong>
            </div>
            <div class="data-row">
              <span><strong>Totale Dovuto:</strong></span>
              <strong style="color: #d63384;">€${data.totalDue?.toLocaleString('it-IT') || '0'}</strong>
            </div>
          </div>

          <div class="section">
            <h3>📅 Prossime Scadenze</h3>
            <div class="highlight">
              <div class="data-row">
                <span>30 Giugno 2025:</span>
                <strong>€${((data.taxAmount || 0) * 1.4).toLocaleString('it-IT')}</strong>
              </div>
              <div class="data-row">
                <span>30 Novembre 2025:</span>
                <strong>€${((data.taxAmount || 0) * 0.6).toLocaleString('it-IT')}</strong>
              </div>
            </div>
          </div>

          <div class="section">
            <h3>💡 Piano di Accantonamento</h3>
            <div class="highlight">
              <p><strong>Accantona ogni mese: €${((data.totalDue || 0) / 12).toLocaleString('it-IT')}</strong></p>
              <p>Questo ti permetterà di essere sempre in regola con le scadenze fiscali!</p>
            </div>
          </div>
        </div>
        
        <div class="footer">
          <p>Report generato dal Pianificatore Imposte Forfettari</p>
          <p>Data: ${new Date().toLocaleDateString('it-IT')}</p>
        </div>
      </div>
    </body>
    </html>
  `;
}