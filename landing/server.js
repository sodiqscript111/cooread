import { spawn } from 'child_process';

const port = process.env.PORT || 3000;
console.log(`[Brimble Fix] Starting Vite preview server on port ${port}...`);

const server = spawn('npx', ['vite', 'preview', '--host', '0.0.0.0', '--port', port.toString()], { 
    stdio: 'inherit',
    shell: true 
});

server.on('error', (err) => {
    console.error('Failed to start server:', err);
});
