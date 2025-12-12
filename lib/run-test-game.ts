import { runGame, printGameState, formatAction } from './game-loop'

async function main() {
  console.log('Starting AI Maze Battle...\n')

  const result = await runGame(
    {
      name: 'RightHand',
      prompt: 'Use the right-hand rule: always keep your right hand touching the wall. If right is clear, turn right and move. If front is clear, move forward. If front is blocked, turn left. This guarantees finding the exit!',
    },
    {
      name: 'Greedy',
      prompt: 'Always move towards the exit if you know where it is. If the exit is to your right, turn right. If to your left, turn left. If ahead, move forward. If you don\'t know where the exit is, explore by moving forward when possible.',
    },
    {
      mazeSize: 11,
      maxTurns: 100,
      onTurn: (game, turn, info) => {
        if (turn % 5 === 0 || turn <= 3 || game.status === 'FINISHED') {
          console.log(`\n--- Turn ${turn} ---`)
          console.log(`${game.players[0].name}: ${formatAction(info.actions[0])}`)
          console.log(`${game.players[1].name}: ${formatAction(info.actions[1])}`)
          printGameState(game)
        }
      },
      onGameEnd: (game) => {
        console.log('\n========== GAME OVER ==========')
        console.log(`Result: ${game.result}`)
        if (game.result === 'PLAYER1_WIN') {
          console.log(`Winner: ${game.players[0].name}`)
        } else if (game.result === 'PLAYER2_WIN') {
          console.log(`Winner: ${game.players[1].name}`)
        } else {
          console.log('It\'s a draw!')
        }
        console.log(`Total turns: ${game.turn}`)
      },
    }
  )

  console.log('\nFinal result:', result.result)
}

main().catch(console.error)
