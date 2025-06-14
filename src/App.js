import { useState } from 'react';

function App() {
  const [character1Name, setCharacter1Name] = useState('');
  const [character1Work, setCharacter1Work] = useState('');
  const [character2Name, setCharacter2Name] = useState('');
  const [character2Work, setCharacter2Work] = useState('');
  const [character1Stats, setCharacter1Stats] = useState(null);
  const [character2Stats, setCharacter2Stats] = useState(null);
  const [battleLog, setBattleLog] = useState('');
  const [winner, setWinner] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  // Lista de grupos conhecidos e suas obras fictícias padrão
  const knownGroups = {
    "cavaleiros de ouro": "Os Cavaleiros do Zodíaco",
    "liga da justiça": "DC Comics",
    "vingadores": "Marvel Comics",
    "power rangers": "Power Rangers",
    "x-men": "Marvel Comics",
    "quarteto fantástico": "Marvel Comics",
    "os 3 mosqueteiros": "Os Três Mosqueteiros",
    "thunderbolts": "Marvel Comics",
    "guardiões da galáxia": "Marvel Comics",
    "titãs": "DC Comics", // Teen Titans
    "sete pecados capitais": "Nanatsu no Taizai",
    "akatsuki": "Naruto",
    "bando do chapéu de palha": "One Piece",
    // Você pode adicionar mais grupos aqui, sempre em minúsculas e sem acentos
  };

  // Função para normalizar nomes (minúsculas, sem acentos, sem espaços extras)
  const normalizeName = (name) => {
    return name.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").trim();
  };

  // Function to call the Gemini API for text generation
  const callGeminiApi = async (prompt, responseSchema = null) => {
    try {
      let chatHistory = [];
      chatHistory.push({ role: "user", parts: [{ text: prompt }] });

      const payload = { contents: chatHistory };
      if (responseSchema) {
        payload.generationConfig = {
          responseMimeType: "application/json",
          responseSchema: responseSchema
        };
      }

      // SUA CHAVE DE API GEMINI REAL FOI INSERIDA AQUI
      const apiKey = "AIzaSyByREQJYWCdMkEqfnNTDFYBjFH8VuDbx0w"; 
      const apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`;

      const response = await fetch(apiUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      const result = await response.json();

      if (result.candidates && result.candidates.length > 0 &&
          result.candidates[0].content && result.candidates[0].content.parts &&
          result.candidates[0].content.parts.length > 0) {
        const text = result.candidates[0].content.parts[0].text;
        if (responseSchema) {
          return JSON.parse(text);
        }
        return text;
      } else {
        console.error("Unexpected API response structure:", result);
        throw new Error("Resposta inesperada da API.");
      }
    } catch (error) {
      console.error("Erro ao chamar a API Gemini:", error);
      throw new Error(`Erro ao gerar conteúdo: ${error.message}`);
    }
  };

  const generateStats = async (characterName, fictionalWork) => {
    const normalizedName = normalizeName(characterName);
    const isGroup = knownGroups.hasOwnProperty(normalizedName);
    // Usa a obra do grupo se for um grupo conhecido, caso contrário usa a obra informada pelo usuário
    const finalWork = isGroup ? knownGroups[normalizedName] : fictionalWork;
    const entityType = isGroup ? "o grupo/equipe" : "o personagem";

    const prompt = `Gere estatísticas de RPG (Força, Inteligência, Estratégia, Agilidade, Durabilidade, Habilidade Especial) e uma breve descrição (máximo 2 frases) para ${entityType} "${characterName}" da obra "${finalWork}". As estatísticas devem ser valores numéricos entre 1 e 100. Para um grupo, considere a força coletiva e as habilidades do grupo como um todo.`;

    const schema = {
      type: "OBJECT",
      properties: {
        "characterName": { "type": "STRING" },
        "fictionalWork": { "type": "STRING" },
        "stats": {
          "type": "OBJECT",
          "properties": {
            "strength": { "type": "NUMBER" },
            "intelligence": { "type": "NUMBER" },
            "strategy": { "type": "NUMBER" },
            "agility": { "type": "NUMBER" },
            "durability": { "type": "NUMBER" },
            "specialAbility": { "type": "STRING" }
          },
          "required": ["strength", "intelligence", "strategy", "agility", "durability", "specialAbility"]
        },
        "description": { "type": "STRING" }
      },
      "required": ["characterName", "fictionalWork", "stats", "description"]
    };
    const result = await callGeminiApi(prompt, schema);
    // Adiciona uma propriedade 'type' para indicar se é um grupo ou individual
    return { ...result, type: isGroup ? 'group' : 'individual' };
  };

  const simulateBattle = async (char1, char2) => {
    // Refere-se ao combatente como "o grupo [Nome]" ou "o personagem [Nome]"
    const char1Ref = char1.type === 'group' ? `o grupo ${char1.characterName}` : char1.characterName;
    const char2Ref = char2.type === 'group' ? `o grupo ${char2.characterName}` : char2.characterName;

    const prompt = `Instruções para a Simulação de Batalha:
- A batalha deve ser 100% imparcial.
- O resultado deve ser estritamente baseado nas estatísticas e habilidades dos combatentes, sem favorecer a ordem de apresentação.
- O combate deve ser dinâmico, descrevendo turnos e ações lógicas.
- Ao final, declare CLARAMENTE o vencedor com a frase "O VENCEDOR É: [Nome do Vencedor]".
- A narrativa deve ter no mínimo 200 palavras.

Simule uma batalha detalhada em texto entre ${char1Ref} (Força: ${char1.stats.strength}, Inteligência: ${char1.stats.intelligence}, Estratégia: ${char1.stats.strategy}, Agilidade: ${char1.stats.agility}, Durabilidade: ${char1.stats.durability}, Habilidade Especial: ${char1.stats.specialAbility}. Descrição: ${char1.description}) e ${char2Ref} (Força: ${char2.stats.strength}, Inteligência: ${char2.stats.intelligence}, Estratégia: ${char2.stats.strategy}, Agilidade: ${char2.stats.agility}, Durabilidade: ${char2.stats.durability}, Habilidade Especial: ${char2.stats.specialAbility}. Descrição: ${char2.description}).`;
    return await callGeminiApi(prompt);
  };

  const handleSimulate = async () => {
    setErrorMessage('');
    setCharacter1Stats(null);
    setCharacter2Stats(null);
    setBattleLog('');
    setWinner('');
    setIsLoading(true);

    if (!character1Name || !character1Work || !character2Name || !character2Work) {
      setErrorMessage("Por favor, preencha todos os campos dos personagens.");
      setIsLoading(false);
      return;
    }

    try {
      const stats1 = await generateStats(character1Name, character1Work);
      setCharacter1Stats(stats1);

      const stats2 = await generateStats(character2Name, character2Work);
      setCharacter2Stats(stats2);

      const battleResult = await simulateBattle(stats1, stats2);
      setBattleLog(battleResult);

      // Extract winner from the battle log
      const winnerMatch = battleResult.match(/O VENCEDOR É: (.+)/i);
      if (winnerMatch && winnerMatch[1]) {
        setWinner(winnerMatch[1].trim());
      } else {
        setWinner("Vencedor não identificado.");
      }

    } catch (error) {
      setErrorMessage(error.message);
    } finally {
      setIsLoading(false);
    }
  };

  // NENHUM useEffect ESPECÍFICO PARA ADSENSE AQUI, POIS O SCRIPT NO INDEX.HTML GERE TUDO AUTOMATICAMENTE.

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 to-gray-700 text-white p-4 font-inter flex flex-col items-center">
      <div className="flex flex-col md:flex-row md:justify-center md:items-start md:space-x-6 lg:space-x-12 w-full max-w-7xl">

        {/* Removido o Left Sidebar para Ads, pois o AdSense automático gerencia o posicionamento. */}
        {/* Removido o Right Sidebar para Ads, pois o AdSense automático gerencia o posicionamento. */}

        {/* Main Content Area - O conteúdo principal agora ocupa a largura total disponível. */}
        <div className="container mx-auto p-6 bg-gray-800 rounded-xl shadow-2xl flex-grow max-w-4xl w-full">
          <h1 className="text-4xl font-extrabold text-center mb-8 text-purple-400 drop-shadow-lg">
            Simulador de Batalha de Personagens
          </h1>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-8">
            {/* Character 1 Input */}
            <div className="bg-gray-700 p-6 rounded-lg shadow-inner border border-gray-600">
              <h2 className="text-2xl font-bold mb-4 text-center text-blue-300">Personagem 1</h2>
              <div className="mb-4">
                <label htmlFor="char1Name" className="block text-gray-300 text-sm font-semibold mb-2">Nome do Personagem:</label>
                <input
                  type="text"
                  id="char1Name"
                  className="w-full p-3 rounded-md bg-gray-900 text-white border border-gray-600 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  value={character1Name}
                  onChange={(e) => setCharacter1Name(e.target.value)}
                  placeholder="Ex: Gandalf ou Cavaleiros de Ouro"
                />
              </div>
              <div className="mb-4">
                <label htmlFor="char1Work" className="block text-gray-300 text-sm font-semibold mb-2">Obra Fictícia:</label>
                <input
                  type="text"
                  id="char1Work"
                  className="w-full p-3 rounded-md bg-gray-900 text-white border border-gray-600 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  value={character1Work}
                  onChange={(e) => setCharacter1Work(e.target.value)}
                  placeholder="Ex: O Senhor dos Anéis (Ignorado para Grupos)"
                />
              </div>
            </div>

            {/* Character 2 Input */}
            <div className="bg-gray-700 p-6 rounded-lg shadow-inner border border-gray-600">
              <h2 className="text-2xl font-bold mb-4 text-center text-red-300">Personagem 2</h2>
              <div className="mb-4">
                <label htmlFor="char2Name" className="block text-gray-300 text-sm font-semibold mb-2">Nome do Personagem:</label>
                <input
                  type="text"
                  id="char2Name"
                  className="w-full p-3 rounded-md bg-gray-900 text-white border border-gray-600 focus:ring-2 focus:ring-red-500 focus:border-transparent"
                  value={character2Name}
                  onChange={(e) => setCharacter2Name(e.target.value)}
                  placeholder="Ex: Sauron ou Liga da Justiça"
                />
              </div>
              <div className="mb-4">
                <label htmlFor="char2Work" className="block text-gray-300 text-sm font-semibold mb-2">Obra Fictícia:</label>
                <input
                  type="text"
                  id="char2Work"
                  className="w-full p-3 rounded-md bg-gray-900 text-white border border-gray-600 focus:ring-2 focus:ring-red-500 focus:border-transparent"
                  value={character2Work}
                  onChange={(e) => setCharacter2Work(e.target.value)}
                  placeholder="Ex: O Senhor dos Anéis (Ignorado para Grupos)"
                />
              </div>
            </div>
          </div>

          <button
            onClick={handleSimulate}
            className="w-full bg-gradient-to-r from-green-500 to-teal-600 hover:from-green-600 hover:to-teal-700 text-white font-bold py-4 px-6 rounded-lg shadow-lg transform transition-all duration-300 hover:scale-105 mb-8 disabled:opacity-50 disabled:cursor-not-allowed"
            disabled={isLoading}
          >
            {isLoading ? (
              <span className="flex items-center justify-center">
                <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                Simulando...
              </span>
            ) : (
              'Simular Batalha'
            )}
          </button>

          {errorMessage && (
        <div className="bg-red-500 text-white p-4 rounded-md mb-8 text-center font-semibold">
          {errorMessage}
        </div>
      )}

      {/* NOVO BLOCO DE CONTEÚDO ESTÁTICO - INÍCIO */}
      <div className="bg-gray-700 p-6 rounded-lg shadow-inner border border-gray-600 mb-8">
        <h2 className="text-2xl font-bold text-center mb-4 text-purple-300">Sobre o Simulador de Batalha</h2>
        <p className="text-gray-300 mb-4 leading-relaxed">
          Bem-vindo ao Simulador de Batalha de Personagens! Aqui, a imaginação encontra a inteligência artificial para criar confrontos épicos. Basta inserir o nome de dois personagens ou equipes de suas obras fictícias favoritas, e nossa IA gerará estatísticas detalhadas de RPG para cada um, como Força, Inteligência e Habilidades Especiais. Em seguida, uma simulação de batalha imparcial será gerada em texto, culminando na declaração de um vencedor. Prepare-se para ver seus heróis e vilões favoritos em duelos inesquecíveis!
        </p>
        <h3 className="text-xl font-bold text-center mb-3 text-blue-300">Como Usar</h3>
        <ul className="list-disc list-inside text-gray-300 space-y-2">
          <li>No campo "Personagem 1", digite o nome do primeiro combatente e a obra fictícia de onde ele vem.</li>
          <li>No campo "Personagem 2", faça o mesmo para o segundo combatente.</li>
          <li>Você pode usar nomes de grupos famosos (como "Cavaleiros de Ouro" ou "Liga da Justiça") para simular batalhas entre equipes.</li>
          <li>Clique em "Simular Batalha" e aguarde a IA gerar as estatísticas e a narrativa do confronto.</li>
          <li>O resultado da batalha e o vencedor serão exibidos logo abaixo.</li>
        </ul>
      </div>
      {/* NOVO BLOCO DE CONTEÚDO ESTÁTICO - FIM */}

      {character1Stats && character2Stats && ( // ESTE É O BLOCO QUE EXIBE AS ESTATÍSTICAS E LOG
        <div className="col-span-full mb-8">
          <h2 className="text-3xl font-bold text-center mb-6 text-yellow-300">Estatísticas dos Personagens</h2>
          {/* ... resto do código das estatísticas e log ... */}
        </div>
      )}

          {character1Stats && character2Stats && (
            <div className="col-span-full mb-8">
              <h2 className="text-3xl font-bold mb-4 text-center text-yellow-300">Estatísticas dos Personagens</h2>
              <div className="flex justify-center gap-8 mb-4"> {/* Avatares at the top */}
                  <div className="flex flex-col items-center">
                      <img
                          src={`https://placehold.co/100x100/4a5568/ffffff?text=${character1Stats.characterName.substring(0,1)}`}
                          alt={`${character1Stats.characterName} avatar`}
                          className="w-24 h-24 rounded-full object-cover border-4 border-blue-400 shadow-md"
                          onError={(e) => { e.currentTarget.src = 'https://placehold.co/100x100/4a5568/ffffff?text=N/A'; }}
                      />
                      <h3 className="text-2xl font-bold mt-2 text-blue-300">{character1Stats.characterName}</h3>
                      <p className="text-gray-400 text-sm italic">{character1Stats.fictionalWork}</p>
                  </div>
                  <div className="flex flex-col items-center">
                      <img
                          src={`https://placehold.co/100x100/4a5568/ffffff?text=${character2Stats.characterName.substring(0,1)}`}
                          alt={`${character2Stats.characterName} avatar`}
                          className="w-24 h-24 rounded-full object-cover border-4 border-red-400 shadow-md"
                          onError={(e) => { e.currentTarget.src = 'https://placehold.co/100x100/4a5568/ffffff?text=N/A'; }}
                      />
                      <h3 className="text-2xl font-bold mt-2 text-red-300">{character2Stats.characterName}</h3>
                      <p className="text-gray-400 text-sm italic">{character2Stats.fictionalWork}</p>
                  </div>
              </div>

              <div className="bg-gray-700 p-6 rounded-lg shadow-inner border border-gray-600">
                  {/* Descriptions in columns */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                      <p className="text-gray-300 italic text-center p-2 rounded-md bg-gray-900">{character1Stats.description}</p>
                      <p className="text-gray-300 italic text-center p-2 rounded-md bg-gray-900">{character2Stats.description}</p>
                  </div>

                  <div className="grid grid-cols-3 gap-2 text-center font-semibold text-gray-200 mb-2 border-b border-gray-600 pb-2">
                      <div className="text-left">Atributo</div>
                      <div className="text-blue-300">{character1Stats.characterName}</div>
                      <div className="text-red-300">{character2Stats.characterName}</div>
                  </div>
                  {['strength', 'intelligence', 'strategy', 'agility', 'durability'].map((statKey) => (
                      <div key={statKey} className="grid grid-cols-3 gap-2 items-center bg-gray-900 p-2 rounded-md mb-1">
                          <div className="text-left capitalize">
                              {statKey === 'strength' && 'Força'}
                              {statKey === 'intelligence' && 'Inteligência'}
                              {statKey === 'strategy' && 'Estratégia'}
                              {statKey === 'agility' && 'Agilidade'}
                              {statKey === 'durability' && 'Durabilidade'}
                          </div>
                          <div className="text-blue-400">{character1Stats.stats[statKey]}</div>
                          <div className="text-red-400">{character2Stats.stats[statKey]}</div>
                      </div>
                  ))}
                  {/* Special Abilities */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
                      <div className="bg-gray-900 p-2 rounded-md">
                          <span className="font-semibold text-gray-200 block text-center">Habilidade Especial ({character1Stats.characterName}):</span>
                          <span className="text-blue-400 block text-center">{character1Stats.stats.specialAbility}</span>
                      </div>
                      <div className="bg-gray-900 p-2 rounded-md">
                          <span className="font-semibold text-gray-200 block text-center">Habilidade Especial ({character2Stats.characterName}):</span>
                          <span className="text-red-400 block text-center">{character2Stats.stats.specialAbility}</span>
                      </div>
                  </div>
                </div>
              </div>
            )}

            {battleLog && (
              <div className="bg-gray-700 p-6 rounded-lg shadow-inner border border-gray-600 mb-8">
                <h2 className="text-2xl font-bold mb-4 text-center text-yellow-300">Registro da Batalha</h2>
                <div className="bg-gray-900 p-4 rounded-md h-96 overflow-y-auto text-gray-200 leading-relaxed">
                  {battleLog.split('\n').map((line, index) => (
                    <p key={index} className="mb-1">{line}</p>
                  ))}
                </div>
              </div>
            )}

            {winner && (
              <div className="bg-gradient-to-r from-purple-600 to-pink-600 text-white p-6 rounded-lg shadow-xl text-center">
                <h2 className="text-3xl font-extrabold mb-2">Vitória!</h2>
                <p className="text-4xl font-black">{winner}</p>
              </div>
            )}
          </div>

          {/* Right Sidebar for Ads - REMOVIDO PARA ADS AUTOMATICOS */}
          {/* Removido o Left Sidebar para Ads, pois o AdSense automático gerencia o posicionamento. */}
          {/* Removido o Right Sidebar para Ads, pois o AdSense automático gerencia o posicionamento. */}
        </div>
      </div>
  );
}

export default App;