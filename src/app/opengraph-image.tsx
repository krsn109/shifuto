import { ImageResponse } from 'next/og'

export const runtime = 'edge'

export const alt = 'Shifuto'
export const size = {
    width: 1200,
    height: 630,
}

export const contentType = 'image/png'

export default async function Image() {
    return new ImageResponse(
        (
            <div
                style={{
                    background: 'linear-gradient(to bottom right, #eef2ff, #ffffff, #eff6ff)',
                    width: '100%',
                    height: '100%',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center',
                }}
            >
                <div
                    style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '20px',
                    }}
                >
                    <div
                        style={{
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            background: '#4f46e5', // indigo-600
                            padding: '20px',
                            borderRadius: '24px',
                            boxShadow: '0 10px 25px -5px rgba(79, 70, 229, 0.4)',
                        }}
                    >
                        <svg
                            xmlns="http://www.w3.org/2000/svg"
                            width="64"
                            height="64"
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="white"
                            strokeWidth="2"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                        >
                            <path d="m12 3-1.912 5.813a2 2 0 0 1-1.275 1.275L3 12l5.813 1.912a2 2 0 0 1 1.275 1.275L12 21l1.912-5.813a2 2 0 0 1 1.275-1.275L21 12l-5.813-1.912a2 2 0 0 1-1.275-1.275L12 3Z" />
                        </svg>
                    </div>
                    <div
                        style={{
                            fontSize: '80px',
                            fontWeight: 800,
                            color: '#111827', // gray-900
                            fontFamily: 'sans-serif',
                        }}
                    >
                        Shifuto
                    </div>
                </div>
                <div
                    style={{
                        marginTop: '30px',
                        fontSize: '32px',
                        color: '#4b5563', // gray-600
                        fontWeight: 500,
                    }}
                >
                    &quot;Shift&quot; を &quot;Auto&quot; で
                </div>
            </div>
        ),
        {
            ...size,
        }
    )
}
