# NEXCHAT

Chat web de sala con:
- Mensajes cifrados en el navegador con AES-256-GCM (Web Crypto).
- Clave derivada localmente con PBKDF2-SHA-256 (250.000 iteraciones).
- Servidor de señalización WebSocket pequeño.
- Llamadas de audio WebRTC (DTLS-SRTP cifra el transporte de medios).
- Interfaz HTML/CSS/JS adaptable.

## 1. Requisitos
- Node.js 18 o superior.
- Para usarlo desde otros dispositivos o por Internet: un servidor con dominio y HTTPS.
- Micrófono y navegador moderno.

## 2. Ejecutarlo en tu PC (prueba local)
Abre una terminal dentro de esta carpeta:

```bash
npm install
npm start
```

Abre http://127.0.0.1:3000 en el navegador. En localhost el navegador permite las funciones seguras necesarias y el cliente usa `ws://` para esta prueba local.

Para probar entre dos personas en el mismo PC, abre dos ventanas/ perfiles distintos, usa la misma sala y la misma contraseña. Para probar desde Internet debes configurar TLS/WSS como se explica abajo.

## 3. Activar WSS (TLS) para Internet con Caddy

WSS no se cifra con una opción dentro del JavaScript. WSS es WebSocket sobre TLS. Lo habitual es que Caddy gestione el certificado HTTPS automáticamente y reenvíe las conexiones WebSocket al servidor Node local.

1. Compra o configura un dominio y apunta su DNS (registro A/AAAA) a la IP pública de tu servidor.
2. Instala Caddy en el servidor.
3. Ejecuta NEXCHAT escuchando solo en localhost:

```bash
npm install
HOST=127.0.0.1 PORT=3000 npm start
```

4. Crea un archivo llamado `Caddyfile` con este contenido, sustituyendo `chat.tudominio.com` por tu dominio:

```caddy
chat.tudominio.com {
    reverse_proxy 127.0.0.1:3000
}
```

5. Inicia o recarga Caddy. Asegúrate de que los puertos TCP 80 y 443 llegan al servidor. Caddy solicitará y renovará el certificado TLS automáticamente.
6. Abre `https://chat.tudominio.com`. El navegador usará `wss://chat.tudominio.com` automáticamente porque el cliente elige `wss:` cuando la página está bajo HTTPS.

No publiques el puerto 3000 directamente en Internet. Mantén Node ligado a 127.0.0.1 y deja que Caddy gestione TLS.

## 4. ¿Qué está cifrado exactamente?

- **WSS/TLS:** cifra el tráfico entre cada navegador y el servidor. Protege frente a escuchas en la red. El servidor termina TLS, por lo que WSS por sí solo NO oculta el contenido al servidor.
- **Mensajes AES-GCM:** el navegador cifra el texto antes de enviarlo. El servidor solo retransmite el texto cifrado y no recibe la contraseña de sala. Todos los miembros deben compartir la misma contraseña. Usa una contraseña larga, aleatoria y comunícala por un canal distinto.
- **Llamadas WebRTC:** el audio usa DTLS-SRTP. En esta demo la llamada es P2P en malla; el audio no se envía como mensajes al servidor de chat. El servidor sí coordina la señalización (SDP/ICE).
- **No es una auditoría criptográfica:** este proyecto es una base educativa, no un producto revisado profesionalmente. No reutilices contraseñas importantes.

## 5. Límites y mejoras necesarias antes de producción
- La contraseña compartida es un esquema sencillo; no ofrece gestión avanzada de identidad, rotación de claves ni protección robusta frente a miembros maliciosos que ya conocen la clave.
- No hay cuentas, invitaciones, moderación ni persistencia de mensajes.
- Para llamadas entre redes restrictivas puede hacer falta un servidor TURN. STUN por sí solo no garantiza que todos puedan conectarse.
- La malla P2P no escala bien a grupos grandes; para ello conviene un SFU (por ejemplo, mediasoup o LiveKit) y revisar el modelo de cifrado.
- Añade autenticación, límites de conexiones/mensajes, registro de abuso, copias de seguridad y pruebas de seguridad antes de exponerlo públicamente.
- Usa solo con personas que acepten participar y respeta la legislación aplicable.

## 6. Cómo verificar WSS
En la versión desplegada, abre las herramientas de desarrollador del navegador → Network → WS. La conexión debe aparecer con una URL que empiece por `wss://`. También puedes abrir el candado del navegador para revisar el certificado HTTPS del dominio.
