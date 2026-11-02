import { getIPVersion } from 'src/helpers/ip-resolver';

const identifyVersion = getIPVersion('192.168.1.1');
console.log(identifyVersion);
