import React, {useState, useEffect} from 'react';
import {Text, View, ImageBackground, Alert} from 'react-native';
import bg from './assets/bg.jpeg';
import {emptyMap} from './src/Utils';
import {getWinner, isTie} from './src/Utils/gameLogic';
import {withAuthenticator} from 'aws-amplify-react-native';
import styles from './App.styles';
import Cell from './src/Components/Cell';
//Amplify Configuration
import {Amplify, Auth, DataStore} from 'aws-amplify';
import {Game} from './src/models';
import config from './src/aws-exports';
import {botTurn} from './src/Utils/bot';
Amplify.configure({
  ...config,
  Analytics: {
    disabled: true,
  },
});

function App() {
  const [map, setMap] = useState(emptyMap);
  const [currentTurn, setCurrentTurn] = useState('x');
  const [gameMode, setGameMode] = useState('BOT_MEDIUM'); // LOCAL, BOT_EASY, BOT_MEDIUM;
  const [game, setGame] = useState(null);
  const [userData, setUserData] = useState(null);

  useEffect(() => {
    resetGame();
    if (gameMode === 'ONLINE') {
      findOrCreateOnlineGame();
    } else {
      deleteTemporaryGame();
    }
  }, [gameMode]);

  useEffect(() => {
    if (currentTurn === 'o' && gameMode !== 'LOCAL') {
      const chosenOption = botTurn(map, gameMode);
      if (chosenOption) {
        onPress(chosenOption.row, chosenOption.col);
      }
    }
  }, [currentTurn, gameMode]);

  useEffect(() => {
    const winner = getWinner(map);
    if (winner) {
      gameWon(winner);
    } else {
      checkTieState();
    }
  }, [map]);
  useEffect(() => {
    Auth.currentAuthenticatedUser().then(setUserData);
  }, []);
  const findOrCreateOnlineGame = async () => {
    const games = await getAvailableGames();
    if (games.length > 0) {
      joingame(games[0]);
    } else {
      await createNewGame();
    }
    // search for the available game which doesn't have a second player
    //if none exist then creates a new game and wait for the second player
  };
  const deleteTemporaryGame = async () => {
    if (!game || game.playerO) {
      setGame(null);
      return;
    }
    await DataStore.delete(Game, game.id);
    setGame(null);
  };
  const joingame = async game => {
    const updatedGame = await DataStore.save(
      Game.copyOf(game, updatedGame => {
        updatedGame.playerO = userData.attributes.sub;
      }),
    );
    setGame(updatedGame);
  };
  const getAvailableGames = async () => {
    const games = await DataStore.query(Game, g => {
      g.playerO('eq', null);
    });
    return games;
  };
  const createNewGame = async () => {
    const emptyStringMap = JSON.stringify(emptyMap);
    const newGame = new Game({
      playerX: userData.attributes.sub,
      map: emptyStringMap,
      currentPlayer: 'X',
      pointsX: 0,
      pointsO: 0,
    });
    const createdGame = await DataStore.save(newGame);
    setGame(createdGame);
  };
  const onPress = (rowIndex, columnIndex) => {
    if (map[rowIndex][columnIndex] !== '') {
      Alert.alert('Position already occupied');
      return;
    }

    setMap(existingMap => {
      const updatedMap = [...existingMap];
      updatedMap[rowIndex][columnIndex] = currentTurn;
      return updatedMap;
    });

    setCurrentTurn(currentTurn === 'x' ? 'o' : 'x');
  };

  const checkTieState = () => {
    if (isTie(map)) {
      Alert.alert(`It's a tie`, `tie`, [
        {
          text: 'Restart',
          onPress: resetGame,
        },
      ]);
    }
  };

  const gameWon = player => {
    Alert.alert(`Huraaay`, `Player ${player} won`, [
      {
        text: 'Restart',
        onPress: resetGame,
      },
    ]);
  };

  const resetGame = () => {
    setMap([
      ['', '', ''], // 1st row
      ['', '', ''], // 2nd row
      ['', '', ''], // 3rd row
    ]);
    setCurrentTurn('x');
  };

  return (
    <View style={styles.container}>
      <ImageBackground source={bg} style={styles.bg} resizeMode="contain">
        <Text
          style={{
            fontSize: 24,
            color: 'white',
            position: 'absolute',
            top: 50,
          }}>
          Current Turn: {currentTurn.toUpperCase()}
        </Text>
        {game && (
          <Text
            style={{
              fontSize: 15,
              color: 'white',
            }}>
            Game id: {game.id}
          </Text>
        )}
        <View style={styles.map}>
          {map.map((row, rowIndex) => (
            <View key={`row-${rowIndex}`} style={styles.row}>
              {row.map((cell, columnIndex) => (
                <Cell
                  key={`row-${rowIndex}-col-${columnIndex}`}
                  cell={cell}
                  onPress={() => onPress(rowIndex, columnIndex)}
                />
              ))}
            </View>
          ))}
        </View>

        <View style={styles.buttons}>
          <Text
            onPress={() => setGameMode('LOCAL')}
            style={[
              styles.button,
              {backgroundColor: gameMode === 'LOCAL' ? '#4F5686' : '#191F24'},
            ]}>
            Local
          </Text>
          <Text
            onPress={() => setGameMode('BOT_EASY')}
            style={[
              styles.button,
              {
                backgroundColor:
                  gameMode === 'BOT_EASY' ? '#4F5686' : '#191F24',
              },
            ]}>
            Easy Bot
          </Text>
          <Text
            onPress={() => setGameMode('BOT_MEDIUM')}
            style={[
              styles.button,
              {
                backgroundColor:
                  gameMode === 'BOT_MEDIUM' ? '#4F5686' : '#191F24',
              },
            ]}>
            Medium Bot
          </Text>
          <Text
            onPress={() => setGameMode('ONLINE')}
            style={[
              styles.button,
              {
                backgroundColor: gameMode === 'ONLINE' ? '#4F5686' : '#191F24',
              },
            ]}>
            ONLINE
          </Text>
        </View>
      </ImageBackground>
    </View>
  );
}

export default withAuthenticator(App);
