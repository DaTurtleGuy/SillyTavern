import express from 'express';

import { getPipeline } from '../transformers.js';
import { Cache } from '../util.js';

const TASK = 'text-classification';

export const router = express.Router();

/**
 * @type {Cache} Cache for classification results (30 minute TTL)
 */
const cacheObject = new Cache(30 * 60 * 1000);

router.post('/labels', async (req, res) => {
    try {
        const pipe = await getPipeline(TASK);
        const result = Object.keys(pipe.model.config.label2id);
        return res.json({ labels: result });
    } catch (error) {
        console.error(error);
        return res.sendStatus(500);
    }
});

router.post('/', async (req, res) => {
    try {
        const { text } = req.body;

        /**
         * Get classification result for a given text
         * @param {string} text Text to classify
         * @returns {Promise<object>} Classification result
         */
        async function getResult(text) {
            const cached = cacheObject.get(text);
            if (cached) {
                return cached;
            }
            const pipe = await getPipeline(TASK);
            const result = await pipe(text, { topk: 5 });
            result.sort((a, b) => b.score - a.score);
            cacheObject.set(text, result);
            return result;
        }

        console.debug('Classify input:', text);
        const result = await getResult(text);
        console.debug('Classify output:', result);

        return res.json({ classification: result });
    } catch (error) {
        console.error(error);
        return res.sendStatus(500);
    }
});
