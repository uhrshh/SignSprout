import type { Metadata } from 'next';
import './globals.css';
export const metadata: Metadata = { title: 'Signsprout — Learn ASL, one small win at a time', description:'An eight-unit beginner ASL course with demonstrations, private webcam practice, quizzes, and spaced review.' };
export default function RootLayout({children}:{children:React.ReactNode}){return <html lang="en" suppressHydrationWarning><head><script dangerouslySetInnerHTML={{__html:`try{var t=localStorage.getItem('signsprout-theme');var d=t==='dark'||(t!=='light'&&window.matchMedia('(prefers-color-scheme: dark)').matches);document.documentElement.classList.toggle('dark',d);document.documentElement.style.colorScheme=d?'dark':'light'}catch{}`}}/></head><body>{children}</body></html>}
