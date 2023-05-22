const fs = require('fs');
const web3 = require('@solana/web3.js');

// Указываем путь к файлу, содержащему список адресов в формате "private key;receive address"
const addressesFile = `${process.env.PWD}/addresses.txt`;

// Указываем минимальный баланс в SOL, который должен быть на счете
const MIN_BALANCE_SOL = 0.33;

// Подключаемся к сети Solana
const connection = new web3.Connection(web3.clusterApiUrl('mainnet-beta'));

async function main() {
  // Читаем список адресов из файла
  const addresses = fs.readFileSync(addressesFile, 'utf-8').trim().split('\n');

  for (const address of addresses) {
    const [privateKeyBase64, recipientAddress] = address.split(';');

    // Декодируем приватный ключ из base64-строки
    const privateKeyBytes = Buffer.from(privateKeyBase64, 'base64');

    // Создаем экземпляр Keypair из приватного ключа
    const senderAccount = web3.Keypair.fromSecretKey(privateKeyBytes);

    // Получаем баланс счета в lamports
    const balance = await connection.getBalance(new web3.PublicKey(recipientAddress));
    console.log(balance)

    // Получаем актуальную информацию о блоке
    const latestBlockhash = await connection.getLatestBlockhash();

    // Проверяем, достаточно ли баланса на счете
    if (balance < MIN_BALANCE_SOL * web3.LAMPORTS_PER_SOL) {
      // Создаем объект транзакции для отправки SOL
      const transaction = new web3.Transaction().add(
        web3.SystemProgram.transfer({
          fromPubkey: senderAccount.publicKey,
          toPubkey: recipientAddress,
          lamports: (MIN_BALANCE_SOL * web3.LAMPORTS_PER_SOL) - balance, // Сумма для пополнения в lamports
        })
      );

      // Устанавливаем recentBlockhash для транзакции
      transaction.recentBlockhash = latestBlockhash.blockhash;

      // Подписываем транзакцию отправителем
      transaction.sign(senderAccount);

      // Отправляем транзакцию в сеть Solana
      connection.sendTransaction(transaction, [senderAccount], {skipPreflight: false, preflightCommitment: 'confirmed'})
        .then((result) => {
          console.log(`Транзакция отправлена с адреса <a href="https://explorer.solana.com/address/${senderAccount.publicKey.toBase58()}" target="_blank">${senderAccount.publicKey.toBase58()}</a> на адрес <a href="https://explorer.solana.com/address/${recipientAddress}" target="_blank">${recipientAddress}</a>: <a href="https://explorer.solana.com/tx/${result}" target="_blank">${result}</a>`);
        })
        .catch(error => {
          console.error(`Ошибка отправки транзакции с адреса ${senderAccount.publicKey.toBase58()} на адрес ${recipientAddress}:`, error.message);
        });
      } else {
      console.log(`Баланс достаточен на адресе ${recipientAddress}`);
    }
  }
}

main();
