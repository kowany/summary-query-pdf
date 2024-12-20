import { Pinecone } from "@pinecone-database/pinecone";
import { PineconeStore } from '@langchain/pinecone';
import { OpenAI, OpenAIEmbeddings  } from '@langchain/openai';
import { NextResponse } from "next/server";

const pinecone = new Pinecone({
    apiKey: process.env.PINECONE_API_KEY!,
});

export async function POST(req: Request) {
    try {
        const {question, documentId} = await req.json();

        if (!question?.trim() || !documentId) {
            return new Response("Missing question or documentId",{status: 400})   
        }

        const embedding = new OpenAIEmbeddings({
            openAIApiKey: process.env.OPENAI_API_KEY!,
        });
        const index = pinecone.Index(process.env.PINECONE_INDEX_NAME!);
        const vectorStore = await PineconeStore.fromExistingIndex(embedding, {
            pineconeIndex: index,
            filter: { documentId }
        })
        const results = await vectorStore.similaritySearch(question, 4);
        if (results.length === 0) {
            return NextResponse.json({
                answer: "I don't know the answer to that question"
            });
        }
        const contentText = results.map((r) => r.pageContent).join('\n');

        const openai = new OpenAI({
            openAIApiKey: process.env.OPENAI_API_KEY!,
        });

        // const prompt = `
        // Eres un asistente de IA útil. Usando el siguiente contexto de un documento, responde
        // con precisión y concisión a la pregunta del usuario. Si el contexto no contiene información
        // relevante para responder a la pregunta, por favor indícalo.

        // Context:
        // ${contentText}

        // Question: ${question}

        // Answer:
        // `
        const prompt = `
        Eres un asistente de IA útil. Usando el contexto proporcionado de un documento, responde con precisión y concisión a la pregunta del usuario. Si el contexto no contiene información relevante para responder a la pregunta, por favor indícalo.

        # Pasos

        1. Analiza el contexto proporcionado para identificar la información relevante.
        2. Razona sobre los datos antes de llegar a una conclusión.
        3. Formula una respuesta precisa y concisa basada en el contexto.
        4. Si la información necesaria no está presente en el contexto, informa al usuario que no se puede proporcionar una respuesta relevante.

        # Formato de Salida

        - La respuesta debe ser un párrafo corto y claro, indicando claramente si la respuesta está basada en el contexto o si el contexto no es suficiente para responder.
        - Menciona la sección o artículo específico del documento que respalda la respuesta cuando sea posible           
        
        # Ejemplos

        **Ejemplo 1:**
        - **Entrada de Contexto:** "El documento habla sobre el Código del Trabajo de Nicaragua."
        - **Pregunta del Usuario:** "¿Qué días son feriados en Nicaragua?"
        - **Salida:** "Sí, los días feriados en Nicaragua son:.

        - Artículo 66.
        Son feriados nacionales obligatorios con derecho a descanso y salario, los siguientes:

        Primero de Enero, Jueves y Viernes Santos, Primero de Mayo, 19 de Julio, Catorce y Quince de Septiembre, Ocho y Veinticinco de Diciembre.

        El Poder Ejecutivo podrá declarar días de asueto con goce de salario o a cuenta de vacaciones, tanto a nivel nacional como municipal.

        Artículo 67.
        Se establece como días de asueto remunerado en la ciudad de Managua el uno y diez de Agosto, y en el resto de la República el día principal de la festividad más importante del lugar según la costumbre.

        Artículo 68.
        Si algún día feriado nacional coincide con el séptimo día, éste será compensado, y al trabajador que labore se le remunerará como día extraordinario de trabajo.

        Artículo 69.
        En días feriados nacionales y de descanso obligatorio podrán realizarse los siguientes trabajos:

        a) Los trabajos que no sean susceptibles de interrupción por la índole de las necesidades que satisfacen; los que lo exigen por motivos de carácter técnico, los de las farmacias de turno y establecimientos dedicados al recreo; y aquellos cuya discontinuidad causaría notables perjuicios al interés público, a la industria o al comercio;

        b) Las faenas destinadas a reparar deterioros ocasionados por fuerza mayor o caso fortuito, siempre que la reparación sea impostergable;

        c) Las obras que, por su naturaleza, no puedan ejecutarse sino en tiempo u ocasiones determinadas que dependan de la acción irregular de fenómenos naturales;

        d) Las labores, industrias o comercios que respondan a las necesidades cotidianas e indispensables de la alimentación.

        Artículo 70.
        En los casos del artículo anterior, el descanso a opción del trabajador puede ser sustituido:

        a) Por otro día de la semana, simultáneamente para todo el personal o por turnos;

        b) Desde el mediodía del correspondiente al descanso hasta el mediodía siguiente;

        c) Por turno, reemplazando el descanso de un día por dos medios días en cada semana.

        Los días feriados nacionales obligatorios con derecho a descanso y salario son:

        Primero de Enero
        Jueves Santo
        Viernes Santo
        Primero de Mayo
        19 de Julio
        14 de Septiembre
        15 de Septiembre
        8 de Diciembre
        25 de Diciembre
        Los días de asueto decretados por el Poder Ejecutivo son:

        En la ciudad de Managua: 1 de Agosto y 10 de Agosto
        En el resto de la República: el día principal de la festividad más importante del lugar según la costumbre.
        Además, el Poder Ejecutivo puede declarar otros días de asueto con goce de salario o a cuenta de vacaciones,
        tanto a nivel nacional como municipal."

        **Ejemplo 2:**

        - **Entrada de Contexto:** "El documento habla sobre el Código del Trabajo de Nicaragua.."
        - **Pregunta del Usuario:** "¿Cuáles son las causas de despido?"
        - **Salida:** "
        Falta grave de probidad: Esto incluye actos de deshonestidad o falta de integridad en el trabajo.
        Falta grave contra la vida e integridad física del empleador o de los compañeros de trabajo: Esto puede incluir actos de violencia o agresión.
        Expresión injuriosa o calumniosa contra el empleador que produzca desprestigio o daños económicos a la empresa: Esto incluye difamación o calumnias que afecten la reputación de la empresa.
        Cualquier violación de las obligaciones que le imponga el contrato individual o reglamento interno, que hayan causado graves daños a la empresa: Esto puede incluir incumplimientos graves de las normas y políticas de la empresa.
        Causas No Justificadas:

        Despido sin causa justificada: Si el empleador rescinde el contrato de trabajo por tiempo indeterminado sin una causa justificada, debe pagar una indemnización al trabajador. La indemnización varía según el tiempo de servicio del trabajador.
        Otras Causas:

        Cesación definitiva de la industria, comercio o servicio basada en motivos económicos legalmente fundamentados y debidamente comprobados por el Ministerio del Trabajo.
        Resolución judicial firme cuya consecuencia sea la desaparición definitiva de la empresa.
        Jubilación del trabajador.
        Fuerza mayor o caso fortuito cuando traigan como consecuencia precisa el cierre de la empresa.
        Estas son algunas de las causas de despido mencionadas en el Código del Trabajo de Nicaragua. Es importante tener en cuenta que el despido debe seguir un procedimiento legal y, en algunos casos, requiere la autorización del Ministerio del Trabajo o de otras autoridades competentes.
        "

        **Ejemplo 3:**

        - **Entrada de Contexto:** "El documento habla sobre el Código del Trabajo de Nicaragua."
        - **Pregunta del Usuario:** "¿Qué beneficios tiene el acero inoxidable en la medicina?"
        - **Salida:** "El contexto no proporciona información sobre el acero inoxidable en la medicina."

        # Notas

        - Evita ofrecer información que no esté directamente respaldada por el contexto proporcionado.
        - Si es posible, utiliza las palabras clave del contexto en la respuesta para asegurar la relevancia.
        
        Context:
        ${contentText}

        Question: ${question}
        
        Answer:`;

        const response = await openai.invoke(prompt);

        console.log(response);
        return NextResponse.json({
            answer: response,
        })
    } catch (error) {
        console.error("Error processing question: " + error);
        return NextResponse.json({
            answer: "An error occurred while processing your question"
        });
    }
}