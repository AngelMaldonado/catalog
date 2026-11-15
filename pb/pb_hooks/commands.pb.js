/// <reference path="../../pb_data/types.d.ts" />
// Console commands for the operator.
//   pocketbase user upsert <email> <password>   creates or updates a business account (`users`)
// In production: docker exec <container> /pb/pocketbase user upsert dueno@negocio.mx '<pass>'

$app.rootCmd.addCommand(
  new Command({
    use: 'user',
    short: 'Business accounts (users collection)',
    run: (cmd, args) => {
      if (args.length !== 3 || args[0] !== 'upsert') {
        console.log('usage: pocketbase user upsert <email> <password>')
        return
      }
      const email = args[1]
      const password = args[2]
      let record
      try {
        record = $app.findAuthRecordByEmail('users', email)
      } catch (_) {
        record = new Record($app.findCollectionByNameOrId('users'))
        record.setEmail(email)
        record.setVerified(true)
      }
      record.setPassword(password)
      $app.save(record)
      console.log(`user ${email} saved (${record.id})`)
    },
  }),
)
