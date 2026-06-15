import os
import numpy as np
from flask import Flask, request, jsonify
from flask_cors import CORS
from tensorflow.keras.models import load_model
from tensorflow.keras.preprocessing.image import img_to_array
from PIL import Image
import io

app = Flask(__name__)
# Enable CORS for the React development frontend on port 5173 (or any origin)
CORS(app, resources={r"/*": {"origins": "*"}})

# Define the model path relative to the server script location
MODEL_PATH = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "new_maleVSfemaleClassification.h5"))

print("Loading model from:", MODEL_PATH)
try:
    model = load_model(MODEL_PATH)
    print("Model loaded successfully.")
except Exception as e:
    print("Error loading model:", str(e))
    model = None

@app.route("/health", methods=["GET"])
def health():
    return jsonify({"status": "healthy", "model_loaded": model is not None})

@app.route("/predict", methods=["POST"])
def predict():
    if model is None:
        return jsonify({"error": "Model not loaded on server."}), 500

    if "file" not in request.files:
        return jsonify({"error": "No file uploaded"}), 400

    file = request.files["file"]
    if file.filename == "":
        return jsonify({"error": "Empty filename uploaded"}), 400

    try:
        # Read the image file using PIL
        image_bytes = file.read()
        image = Image.open(io.BytesIO(image_bytes))

        # Convert to RGB if not already
        if image.mode != "RGB":
            image = image.convert("RGB")

        # Resize to (224, 224) matching model target size
        image = image.resize((224, 224))

        # Convert image to numpy array
        img_array = img_to_array(image)

        # Rescale the image pixels by 1/255 (to match training generators)
        img_array = img_array / 255.0

        # Expand dims to shape (1, 224, 224, 3)
        img_array = np.expand_dims(img_array, axis=0)

        # Run prediction
        prediction = model.predict(img_array)
        prob = float(prediction[0][0])

        # Binary classification mapping
        # class_indices was {'men': 0, 'women': 1} or {'man': 0, 'woman': 1}
        # probability close to 1 means woman, close to 0 means man.
        if prob > 0.5:
            gender = "woman"
            confidence = prob * 100
        else:
            gender = "man"
            confidence = (1 - prob) * 100

        print(f"Prediction result: {gender} ({confidence:.2f}%)")

        return jsonify({
            "gender": gender,
            "confidence": round(confidence, 2),
            "probability": prob
        })

    except Exception as e:
        print("Prediction error:", str(e))
        return jsonify({"error": str(e)}), 500

if __name__ == "__main__":
    # Run server on port 5000
    app.run(host="0.0.0.0", port=5000, debug=False)
