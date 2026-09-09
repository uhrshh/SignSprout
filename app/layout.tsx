import type { Metadata } from 'next';
import './globals.css';
export const metadata: Metadata = { title: 'Signsprout — Your first signs', description:'Learn your first ASL handshapes with playful, private webcam practice.' };
export default function RootLayout({children}:{children:React.ReactNode}){return <html lang="en"><body>{children}</body></html>}
