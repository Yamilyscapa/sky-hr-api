import { Resend } from "resend";

const resend = new Resend(process.env.RESEND_API_KEY);

export const sendEmail = async (to: string, subject: string, html: string) => {
    try {
        const { data, error } = await resend.emails.send({
            from: "SkyHR <onboarding@resend.dev>",
            to: to,
            subject: subject,
            html,
        });

        if (error) {
            console.error("Error sending email:", error);
            throw new Error("Error sending email");
        }

        return data;
    } catch (error) {
        console.error("Error sending email:", error);
        throw error;
    }
};