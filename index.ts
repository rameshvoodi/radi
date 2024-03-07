import { ethers } from 'ethers';
import axios from 'axios';
import WebSocket from 'ws';
import { createLogger, format, transports } from 'winston';
interface AbiItem {
    constant?: boolean;
    inputs?: { name: string, type: string, indexed?: boolean }[];
    name?: string;
    outputs?: { name: string, type: string }[];
    payable?: boolean;
    stateMutability?: "nonpayable" | "payable" | "view" | "pure";
    type?: "function" | "constructor" | "event" | "fallback";
    anonymous?: boolean;
  }
  
  const logger = createLogger({
    level: 'info',
    format: format.combine(
      format.timestamp({
        format: 'YYYY-MM-DD HH:mm:ss'
      }),
      format.errors({ stack: true }),
      format.splat(),
      format.json()
    ),
    defaultMeta: { service: 'user-service' },
    transports: [
      new transports.File({ filename: 'error.log', level: 'error' }),
      new transports.File({ filename: 'combined.log' })
    ]
  });
  const contractABI: AbiItem[] = []; 
  async function fetchAbi() {
    try {
      // Replace with the URL for the Raydium contract ABI documentation
      const response = await axios.get('https://docs.raydium.io/json/Raydium.json');
      const data = await response.data;
      contractABI.push(...data.abi); 
    } catch (error) {
      logger.error('Error fetching ABI:', error);
      throw error; 
    }
  }
  
  
  async function main() {
    await fetchAbi();
  
    const provider = new ethers.providers.JsonRpcProvider('https://solana-api.projectserum.com');
    const contractAddress = 'raydium_contract_address'; // Replace with the actual contract address
   
    const contract = new ethers.Contract(contractAddress, contractABI, provider);
  
    const ws = new WebSocket('ws://python_bot_url'); // Replace with the actual Python bot's WebSocket URL
  
      ws.on('open', () => {
          contract.on('NewLiquidityPool', async (creator, poolAddress) => {
        try {
          console.log(`New liquidity pool created by ${creator} at ${poolAddress}`);
          logger.info('New liquidity pool detected', { creator, poolAddress });
  
          const data = { creator, poolAddress };
          ws.send(JSON.stringify(data));
        } catch (error) {
          logger.error('Error in NewLiquidityPool event handler:', error);
        }
      });
    });
  
    ws.on('error', error => {
      logger.error('WebSocket error:', error);
    });
  
    
    process.on('unhandledRejection', (reason, promise) => {
      logger.error('Unhandled Rejection at:', promise, 'reason:', reason);
    });
  
    process.on('uncaughtException', error => {
      logger.error('Uncaught Exception:', error);
    });
  }
  
  main().catch(error => {
    logger.error('Error in main function:', error);
  });