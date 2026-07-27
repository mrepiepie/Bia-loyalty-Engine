const fs = require('fs');
let app = fs.readFileSync('public/app.js', 'utf8');

const target = `            const payload = {
                name: document.getElementById('partner-form-name').value.trim(),
                title: document.getElementById('partner-form-title').value.trim(),
                subtitle: document.getElementById('partner-form-subtitle').value.trim(),
                image: base64Image,
                logoColor: document.getElementById('partner-form-color').value,
                rewards: [
                    {
                        name: document.getElementById('reward-1-name').value.trim(),
                        cost: parseInt(document.getElementById('reward-1-cost').value),
                        cash: document.getElementById('reward-1-cash').value.trim(),
                        icon: "fa-mug-hot"
                    },
                    {
                        name: document.getElementById('reward-2-name').value.trim(),
                        cost: parseInt(document.getElementById('reward-2-cost').value),
                        cash: document.getElementById('reward-2-cash').value.trim(),
                        icon: "fa-gift"
                    },
                    {
                        name: document.getElementById('reward-3-name').value.trim(),
                        cost: parseInt(document.getElementById('reward-3-cost').value),
                        cash: document.getElementById('reward-3-cash').value.trim(),
                        icon: "fa-car-side"
                    }
                ]
            };`;

const replacement = `            const rawRewards = [
                {
                    name: document.getElementById('reward-1-name').value.trim(),
                    cost: document.getElementById('reward-1-cost').value.trim(),
                    cash: document.getElementById('reward-1-cash').value.trim(),
                    icon: "fa-mug-hot"
                },
                {
                    name: document.getElementById('reward-2-name').value.trim(),
                    cost: document.getElementById('reward-2-cost').value.trim(),
                    cash: document.getElementById('reward-2-cash').value.trim(),
                    icon: "fa-gift"
                },
                {
                    name: document.getElementById('reward-3-name').value.trim(),
                    cost: document.getElementById('reward-3-cost').value.trim(),
                    cash: document.getElementById('reward-3-cash').value.trim(),
                    icon: "fa-car-side"
                }
            ];

            const rewards = [];
            for (let i = 0; i < rawRewards.length; i++) {
                const r = rawRewards[i];
                const isFilled = r.name !== "" || r.cost !== "" || r.cash !== "";
                const isComplete = r.name !== "" && r.cost !== "" && r.cash !== "";
                
                if (isFilled && !isComplete) {
                    showToast('Validation Error', \`Reward \${i+1} is partially filled. Please fill out all fields for this reward, or clear them all.\`, 'error');
                    return;
                }
                
                if (isComplete) {
                    rewards.push({
                        name: r.name,
                        cost: parseInt(r.cost),
                        cash: r.cash,
                        icon: r.icon
                    });
                }
            }

            if (rewards.length === 0) {
                showToast('Validation Error', 'You must provide at least 1 complete reward.', 'error');
                return;
            }

            const payload = {
                name: document.getElementById('partner-form-name').value.trim(),
                title: document.getElementById('partner-form-title').value.trim(),
                subtitle: document.getElementById('partner-form-subtitle').value.trim(),
                image: base64Image,
                logoColor: document.getElementById('partner-form-color').value,
                rewards: rewards
            };`;

app = app.replace(target, replacement);
fs.writeFileSync('public/app.js', app, 'utf8');
