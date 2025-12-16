# Vocab Master Amplify

This project is a vocabulary learning application built with Next.js and AWS Amplify. It provides flashcard functionality for users to learn Japanese or Finnish words.

## Overview

Vocab Master Amplify is a full-stack application that integrates authentication, API, database, storage, and serverless functions using AWS Amplify Gen 2. Users can add words and study using flashcards.

## Features

- **Authentication**: Secure user authentication using Amazon Cognito
- **API**: GraphQL endpoint powered by AWS AppSync
- **Database**: Real-time database using Amazon DynamoDB
- **Storage**: Image storage using Amazon S3
- **Serverless Functions**: Word content generation using AWS Lambda
- **Flashcard Learning**: Interactive learning interface
- **AI-Powered Content Generation**: Uses OpenAI API to automatically generate meanings, example sentences, and related images when users input words

## Supported Languages

- Japanese (for Finnish speakers)
- Finnish (for Japanese speakers)

## Tech Stack

- **Frontend**: Next.js (App Router), React, TypeScript
- **Backend**: AWS Amplify Gen 2, AWS Lambda
- **Database**: Amazon DynamoDB
- **Authentication**: Amazon Cognito
- **Storage**: Amazon S3
- **API**: AWS AppSync (GraphQL)

## Setup

### Prerequisites

- Node.js (version 18 or higher)
- AWS CLI
- AWS Amplify CLI

### Installation

1. Clone the repository:
   ```bash
   git clone https://github.com/Misato-Seki/vocab-master-amplify.git
   cd vocab-master-amplify
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Pull the Amplify backend:
   ```bash
   npx amplify pull --appId <your-app-id> --envName <your-env-name>
   ```

4. Set environment variables:
   - Configure OpenAI API key (for word generation feature)

5. Start the development server:
   ```bash
   npm run dev
   ```

## Usage

1. Access the application and register/login as a user
2. Add new words (using the auto-generation feature)
3. Start learning on the flashcards page

## Deploying to AWS

For detailed deployment instructions, refer to the [AWS Amplify documentation](https://docs.amplify.aws/nextjs/start/quickstart/nextjs-app-router-client-components/#deploy-a-fullstack-app-to-aws).

## Security

See [CONTRIBUTING](CONTRIBUTING.md#security-issue-notifications) for more information.

## License

This library is licensed under the MIT-0 License. See the LICENSE file.