ALTER TABLE `UserAiCredential`
  MODIFY `provider` ENUM('GEMINI', 'OPENAI') NOT NULL;
