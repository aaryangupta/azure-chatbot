import { useRef, useState, useEffect, useContext, useLayoutEffect } from 'react';
import { CommandBarButton, IconButton, Dialog, DialogType, Stack } from '@fluentui/react';
import { SquareRegular, ShieldLockRegular, ErrorCircleRegular } from '@fluentui/react-icons';

import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import rehypeRaw from 'rehype-raw';
import uuid from 'react-uuid';
import { isEmpty } from 'lodash';
import DOMPurify from 'dompurify';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { nord } from 'react-syntax-highlighter/dist/esm/styles/prism';

import styles from './Chat.module.css';
import Contoso from '../../assets/Contoso.svg';
import { XSSAllowTags } from '../../constants/sanatizeAllowables';

import {
  ChatMessage,
  ConversationRequest,
  conversationApi,
  Citation,
  ChatResponse,
  Conversation,
  historyGenerate,
  historyUpdate,
  historyClear,
  ChatHistoryLoadingState,
  CosmosDBStatus,
  ErrorMessage,
  ExecResults,
} from '../../api';

import { Answer } from '../../components/Answer';
import { QuestionInput } from '../../components/QuestionInput';
import { ChatHistoryPanel } from '../../components/ChatHistory/ChatHistoryPanel';
import { AppStateContext } from '../../state/AppProvider';
import { useBoolean } from '@fluentui/react-hooks';

const enum messageStatus {
  NotRunning = 'Not Running',
  Processing = 'Processing',
  Done = 'Done',
}

const Chat = () => {
  const appStateContext = useContext(AppStateContext);
  const ui = appStateContext?.state.frontendSettings?.ui;
  const chatMessageStreamEnd = useRef<HTMLDivElement | null>(null);
  
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [showLoadingMessage, setShowLoadingMessage] = useState<boolean>(false);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [processMessages, setProcessMessages] = useState<messageStatus>(messageStatus.NotRunning);
  const [logo, setLogo] = useState('');
  const [answerId, setAnswerId] = useState<string>('');
  
  useEffect(() => {
    setLogo(ui?.chat_logo || ui?.logo || Contoso);
  }, [appStateContext?.state.isLoading]);

  return (
    <div className={styles.container} role="main">
      <Stack horizontal className={styles.chatRoot}>
        <div className={styles.chatContainer}>
          {!messages || messages.length < 1 ? (
            <Stack className={styles.chatEmptyState}>
              <img src={logo} className={styles.chatIcon} aria-hidden="true" />
              <h1 className={styles.chatEmptyStateTitle}>{ui?.chat_title}</h1>
              <h2 className={styles.chatEmptyStateSubtitle}>{ui?.chat_description}</h2>
            </Stack>
          ) : (
            <div className={styles.chatMessageStream} style={{ marginBottom: isLoading ? '40px' : '0px' }} role="log">
              {messages.map((answer, index) => (
                <div key={index} className={styles.chatMessageGpt}>{answer.content}</div>
              ))}
              <div ref={chatMessageStreamEnd} />
            </div>
          )}
          <Stack horizontal className={styles.chatInput}>
            <QuestionInput
              clearOnSend
              placeholder="Type a new question..."
              disabled={isLoading}
              onSend={(question, id) => {
                appStateContext?.state.isCosmosDBAvailable?.cosmosDB
                  ? makeApiRequestWithCosmosDB(question, id)
                  : makeApiRequestWithoutCosmosDB(question, id);
              }}
              conversationId={appStateContext?.state.currentChat?.id}
            />
          </Stack>
        </div>
      </Stack>
    </div>
  );
};

export default Chat;
