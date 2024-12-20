import { Pinecone } from '@pinecone-database/pinecone';
import { PDFLoader } from '@langchain/community/document_loaders/fs/pdf'
import { RecursiveCharacterTextSplitter } from 'langchain/text_splitter';
import { OpenAI, OpenAIEmbeddings  } from '@langchain/openai';


import { PineconeStore } from '@langchain/pinecone';
import { NextResponse } from 'next/server';


const pinecone = new Pinecone({
    apiKey: process.env.PINECONE_API_KEY!,
});

export async function POST(req: Request) {
    try {
        
        const formData = await req.formData();
        const file = formData.get('file') as File;

        if (!file) {
            return new Response("No file provided", {status: 404})
        }

        // Generate document id
        const documentId = crypto.randomUUID();
        // Convert file to blob
        const blob = new Blob( [await file.arrayBuffer()], {type: file.type} );

        // Load and parse document PDF
        const loader = new PDFLoader(blob);
        const docs = await loader.load();

        // Split text into chunks
        const textSplitter = new RecursiveCharacterTextSplitter({
            chunkSize: 1000,
            chunkOverlap: 200
        });

        const splitDocs = await textSplitter.splitDocuments(docs);

        // Add documentId to metadata of each chunk
        const docsWithMetadata = splitDocs.map((doc) => ({
            ...doc,
            metadata: {
                ...doc.metadata,
                documentId,
            }
        }));

        // Generate summary
        const openai = new OpenAI({
            openAIApiKey: process.env.OPENAI_API_KEY,
            // streaming: true,
        })

        const summary = await openai.invoke(
            `1. **Leer el documento completo:** Extrae la información relevante asegurándote de comprender el contenido general del documento.
             2. **Identificar secciones clave:** Busca secciones o artículos importantes que definan el propósito y las provisiones del documento.
             3. **Considerar la superposición de fragmentos:** Ten en cuenta que el documento tiene fragmentos superpuestos debido al parámetro "chunkOverlap: 200". Esto puede provocar repeticiones o falta de coherencia al unir fragmentos.
             4. **Redactar el resumen:** Integrar la información relevante en un resumen claro, eliminando redundancias y asegurando la cohesión sin perder precisión.
             5. **Revisar y ajustar:** Asegúrate de que el resumen final sea comprensible y fluido, corrigiendo posibles errores derivados de la superposición de fragmentos.

             # Output Format
 
             Redacta un resumen de longitud moderada (aproximadamente 100 palabras) en un párrafo único
             con buena estructura y coherencia, eliminando redundancias debidas a superposiciones. Por ejemplo,
             está iniciando el párrafo "mejorados pero nunca reducidos u olvidados" y hasta después aparece
             "El Código del trabajo de Nicaragua ...", no quiero que aparezca la primera parte porque eso es
             parte del "chunkOverlap"
 
             # Notes
 
             - Evitar repeticiones derivadas del procesamiento de superposiciones de fragmentos.
             - Mantener la esencia y propósito original del documento.
             - Recuerda que el documento es una ley o código, por lo que precisa precisión en la terminología
             legal. El documento es el siguiente: ${splitDocs[0].pageContent}`
          );

          // Store in Pinecone with metadata
        const embeddings = new OpenAIEmbeddings({
            openAIApiKey: process.env.OPENAI_API_KEY
        });

        const index = pinecone.Index(process.env.PINECONE_INDEX_NAME!);
        await PineconeStore.fromDocuments(docsWithMetadata, embeddings, {
            pineconeIndex: index
        });
        return NextResponse.json({
            summary,
            documentId,
            pageCount: docs.length
        });
    } catch (error) {
        const errorMessage =
        error instanceof Error ? error.message : "Unknown error";
        console.error(errorMessage);
        return new Response(errorMessage, { status: 500 });
    }
}